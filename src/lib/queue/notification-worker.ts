import 'server-only';
import { Worker, Job } from 'bullmq';
import { redisConnection, NotificationJobData } from './queue-config';
import { sendEmail } from '../notifications/email-service';
import { sendWhatsApp } from '../notifications/whatsapp-service';
import { getPgPool } from '../postgres';

/**
 * Notification Worker
 * Processes queued notification jobs with retry logic
 */

// Email notification processor
async function processEmailJob(job: Job<NotificationJobData>): Promise<void> {
  const data = job.data;
  
  console.log(`📧 Processing email job ${job.id}: ${data.event} to ${data.recipientEmail}`);
  
  if (!data.recipientEmail) {
    throw new Error('Missing recipient email');
  }
  
  // Send email
  await sendEmail({
    to: data.recipientEmail,
    subject: data.subject || 'AgriReports Notification',
    html: data.html || `<p>${data.message}</p>`,
    text: data.message,
  });
  
  // Update notification status in database
  await updateNotificationStatus(data.reportId, data.recipientId, 'email', 'sent');
  
  console.log(`✅ Email sent successfully: ${job.id}`);
}

// WhatsApp notification processor
async function processWhatsAppJob(job: Job<NotificationJobData>): Promise<void> {
  const data = job.data;
  
  console.log(`📱 Processing WhatsApp job ${job.id}: ${data.event} to ${data.recipientPhone}`);
  
  if (!data.recipientPhone) {
    throw new Error('Missing recipient phone');
  }
  
  // Send WhatsApp
  let result: { messageId: string };
  
  if (data.template) {
    // Use template
    result = await sendWhatsApp({
      to: data.recipientPhone,
      message: data.message,
      template: data.template,
    });
  } else {
    // Free-form message
    result = await sendWhatsApp({
      to: data.recipientPhone,
      message: data.message,
    });
  }
  
  // Update notification status in database
  await updateNotificationStatus(data.reportId, data.recipientId, 'whatsapp', 'sent', result.messageId);
  
  console.log(`✅ WhatsApp sent successfully: ${job.id} (Message ID: ${result.messageId})`);
}

// Helper: Update notification status in database
async function updateNotificationStatus(
  reportId: string,
  recipientId: string | undefined,
  channel: string,
  status: string,
  waMessageId?: string
): Promise<void> {
  try {
    const pool = getPgPool();
    
    // Find the notification record
    const query = `
      UPDATE agri_notifications
      SET status = $1,
          wa_message_id = COALESCE($2, wa_message_id),
          sent_at = NOW(),
          updated_at = NOW()
      WHERE report_id = $3
        AND channel = $4
        AND recipient_id = $5
        AND status = 'queued'
      RETURNING id
    `;
    
    const result = await pool.query(query, [
      status,
      waMessageId || null,
      reportId,
      channel,
      recipientId || null,
    ]);
    
    if (result.rowCount === 0) {
      // Create new notification record if not found
      await pool.query(
        `INSERT INTO agri_notifications 
         (report_id, recipient_id, recipient_name, recipient_email, recipient_phone, 
          channel, event, message, status, wa_message_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
        [
          reportId,
          recipientId || null,
          'Unknown', // Would be passed in job data in production
          null,
          null,
          channel,
          'report_submitted', // Would be passed in job data
          'Notification sent',
          status,
          waMessageId || null,
        ]
      );
    }
  } catch (error) {
    console.error('Failed to update notification status:', error);
    // Don't throw - we don't want to fail the job for DB update issues
  }
}

// Create and start the worker
export function createNotificationWorker() {
  const worker = new Worker<NotificationJobData>(
    'notifications',
    async (job: Job<NotificationJobData>) => {
      const { channel } = job.data;
      
      try {
        if (channel === 'email') {
          await processEmailJob(job);
        } else if (channel === 'whatsapp') {
          await processWhatsAppJob(job);
        } else {
          throw new Error(`Unknown channel: ${channel}`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Job ${job.id} failed (attempt ${job.attemptsMade}):`, errorMessage);
        
        // If max attempts reached, move to failed queue
        if (job.attemptsMade >= job.opts.attempts!) {
          await handleFailedJob(job, new Error(errorMessage));
        }
        
        throw error; // Re-throw to trigger BullMQ retry logic
      }
    },
    {
      connection: redisConnection,
      concurrency: 10, // Process 10 jobs simultaneously
      limiter: {
        max: 100, // Max 100 jobs
        duration: 60000, // Per minute
      },
    }
  );

  // Event listeners
  worker.on('completed', (job: Job<NotificationJobData>) => {
    console.log(`✅ Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job: Job<NotificationJobData> | undefined, error: Error) => {
    if (job) {
      console.error(`❌ Job ${job.id} failed permanently:`, error.message);
    }
  });

  worker.on('error', (error: Error) => {
    console.error('🚨 Worker error:', error);
  });

  worker.on('stalled', (jobId: string) => {
    console.warn(`⚠️ Job ${jobId} stalled`);
  });

  return worker;
}

// Handle permanently failed jobs
async function handleFailedJob(job: Job<NotificationJobData>, error: Error): Promise<void> {
  console.error(`🚨 Job ${job.id} failed permanently, logging to database`);
  
  try {
    const pool = getPgPool();
    
    // Update notification status to failed
    await pool.query(
      `UPDATE agri_notifications
       SET status = 'failed',
           last_error = $1,
           retry_count = $2,
           updated_at = NOW()
       WHERE report_id = $3
         AND channel = $4
         AND status IN ('queued', 'sent')`,
      [
        error.message,
        job.attemptsMade,
        job.data.reportId,
        job.data.channel,
      ]
    );
    
    // Log to audit table
    await pool.query(
      `INSERT INTO agri_report_audit_log 
       (report_id, actor_name, action, details, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        job.data.reportId,
        'System',
        'notification_failed',
        `Failed to send ${job.data.channel} notification: ${error.message}`,
        JSON.stringify({
          jobId: job.id,
          attempts: job.attemptsMade,
          channel: job.data.channel,
          event: job.data.event,
          recipient: job.data.recipientName,
        }),
      ]
    );
  } catch (dbError) {
    console.error('Failed to log job failure to database:', dbError);
  }
}

// Export for use in other modules
export { Worker, Job };
