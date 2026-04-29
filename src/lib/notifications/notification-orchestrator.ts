// Notification Orchestrator Service
// Coordinates sending notifications via email and WhatsApp
// Supports both direct sending and queue-based sending

import type { Report } from '../../types/agrireports';
import { sendEmail } from './email-service';
import { reportSubmittedTemplate, reportReviewedTemplate } from './email-templates';
import { sendWhatsApp, buildSubmittedTemplate, buildReviewedTemplate, buildSubmittedFreeform, buildReviewedFreeform } from './whatsapp-service';
import { notificationQueue, NotificationJobData } from '../queue/queue-config';

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
const USE_QUEUE = process.env.USE_NOTIFICATION_QUEUE === 'true';

/**
 * Notify reviewers when a report is submitted
 * Sends both email and WhatsApp notifications
 * Uses queue if USE_NOTIFICATION_QUEUE=true, otherwise sends directly
 */
export async function notifyReviewersOnSubmit(
  report: Report,
  reviewers: Array<{ email: string; name: string; phone?: string }>
): Promise<void> {
  const reviewLink = `${APP_BASE_URL}/reports/${report.id}`;

  for (const reviewer of reviewers) {
    // Queue or send email notification
    if (USE_QUEUE) {
      await queueEmailNotification(report, reviewer.email, reviewer.name, 'report_submitted');
    } else {
      await sendDirectEmailNotification(report, reviewer.email, reviewer.name, 'submitted');
    }

    // Queue or send WhatsApp notification if phone number available
    if (reviewer.phone) {
      if (USE_QUEUE) {
        await queueWhatsAppNotification(report, reviewer.phone, reviewer.name, 'report_submitted', reviewLink);
      } else {
        await sendDirectWhatsAppNotification(report, reviewer.phone, 'submitted', reviewLink);
      }
    }
  }
  
  console.log(`✅ Notifications ${USE_QUEUE ? 'queued' : 'sent'} for report submission: ${report.id}`);
}

/**
 * Notify author when their report is reviewed
 * Sends both email and WhatsApp notifications
 * Uses queue if USE_NOTIFICATION_QUEUE=true, otherwise sends directly
 */
export async function notifyAuthorOnReview(
  report: Report,
  author: { email: string; name: string; phone?: string }
): Promise<void> {
  // Queue or send email notification
  if (USE_QUEUE) {
    await queueEmailNotification(report, author.email, author.name, 'report_reviewed');
  } else {
    await sendDirectEmailNotification(report, author.email, author.name, 'reviewed');
  }

  // Queue or send WhatsApp notification if phone number available
  if (author.phone) {
    if (USE_QUEUE) {
      await queueWhatsAppNotification(report, author.phone, author.name, 'report_reviewed');
    } else {
      await sendDirectWhatsAppNotification(report, author.phone, 'reviewed');
    }
  }
  
  console.log(`✅ Notifications ${USE_QUEUE ? 'queued' : 'sent'} for report review: ${report.id}`);
}

/**
 * Send only email notification (for systems without WhatsApp)
 */
export async function notifyEmailOnly(
  to: string,
  name: string,
  subject: string,
  html: string
): Promise<void> {
  try {
    await sendEmail({ to, subject, html });
    console.log(`✅ Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
  }
}

/**
 * Send only WhatsApp notification (for urgent alerts)
 */
export async function notifyWhatsAppOnly(
  phone: string,
  message: string
): Promise<void> {
  try {
    await sendWhatsApp({ to: phone, message });
    console.log(`✅ WhatsApp sent to ${phone}`);
  } catch (error) {
    console.error(`Failed to send WhatsApp to ${phone}:`, error);
  }
}

// ============================================================
// Queue Helper Functions
// ============================================================

/**
 * Queue email notification for async processing
 */
async function queueEmailNotification(
  report: Report,
  email: string,
  name: string,
  event: 'report_created' | 'report_submitted' | 'report_reviewed' | 'report_approved' | 'report_rejected'
): Promise<void> {
  const { subject, html } = event.includes('submitted')
    ? reportSubmittedTemplate(report, email, name)
    : reportReviewedTemplate(report, email, name);

  const jobData: NotificationJobData = {
    reportId: report.id,
    recipientName: name,
    recipientEmail: email,
    channel: 'email',
    event,
    subject,
    message: subject,
    html,
  };

  await notificationQueue.add('email-notification', jobData, {
    jobId: `email-${report.id}-${Date.now()}`,
  });
}

/**
 * Queue WhatsApp notification for async processing
 */
async function queueWhatsAppNotification(
  report: Report,
  phone: string,
  name: string,
  event: 'report_created' | 'report_submitted' | 'report_reviewed' | 'report_approved' | 'report_rejected',
  reviewLink?: string
): Promise<void> {
  const isConfigured = process.env.META_PHONE_NUMBER_ID && process.env.META_ACCESS_TOKEN;
  const message = event.includes('submitted') && reviewLink
    ? buildSubmittedFreeform(report, reviewLink)
    : buildReviewedFreeform(report);

  const jobData: NotificationJobData = {
    reportId: report.id,
    recipientName: name,
    recipientPhone: phone,
    channel: 'whatsapp',
    event,
    message,
  };

  if (isConfigured) {
    jobData.template = event.includes('submitted') && reviewLink
      ? buildSubmittedTemplate(report, reviewLink)
      : buildReviewedTemplate(report);
  }

  await notificationQueue.add('whatsapp-notification', jobData, {
    jobId: `whatsapp-${report.id}-${Date.now()}`,
  });
}

/**
 * Send email notification directly (synchronous)
 */
async function sendDirectEmailNotification(
  report: Report,
  email: string,
  name: string,
  action: 'submitted' | 'reviewed'
): Promise<void> {
  try {
    const { subject, html } = action === 'submitted'
      ? reportSubmittedTemplate(report, email, name)
      : reportReviewedTemplate(report, email, name);
    
    await sendEmail({ to: email, subject, html });
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error);
  }
}

/**
 * Send WhatsApp notification directly (synchronous)
 */
async function sendDirectWhatsAppNotification(
  report: Report,
  phone: string,
  action: 'submitted' | 'reviewed',
  reviewLink?: string
): Promise<void> {
  try {
    const isConfigured = process.env.META_PHONE_NUMBER_ID && process.env.META_ACCESS_TOKEN;
    
    if (isConfigured) {
      const template = action === 'submitted' && reviewLink
        ? buildSubmittedTemplate(report, reviewLink)
        : buildReviewedTemplate(report);
      
      await sendWhatsApp({
        to: phone,
        message: '',
        template,
      });
    } else {
      const message = action === 'submitted' && reviewLink
        ? buildSubmittedFreeform(report, reviewLink)
        : buildReviewedFreeform(report);
      
      await sendWhatsApp({ to: phone, message });
    }
  } catch (error) {
    console.error(`Failed to send WhatsApp to ${phone}:`, error);
  }
}
