import 'server-only';
import Redis from 'ioredis';
import { Queue, Job } from 'bullmq';

const queueEnabled = process.env.USE_NOTIFICATION_QUEUE === 'true';

function createDisabledQueue(name: string) {
  return {
    name,
    add: async () => {
      throw new Error('Notification queue is disabled. Set USE_NOTIFICATION_QUEUE=true and REDIS_URL to enable it.');
    },
    getWaitingCount: async () => 0,
    getActiveCount: async () => 0,
    getCompletedCount: async () => 0,
    getFailedCount: async () => 0,
    getJobs: async () => [],
    obliterate: async () => undefined
  } as unknown as Queue;
}

// Redis connection. Keep this lazy-disabled so builds and direct notifications do
// not try to connect to localhost Redis when USE_NOTIFICATION_QUEUE=false.
const redisConnection = queueEnabled
  ? new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,    // Required for BullMQ
      retryStrategy: (times) => {
        if (times > 10) {
          console.error('Redis connection failed after 10 retries');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000); // Exponential backoff
      },
    })
  : null;

// Queue configurations
export const notificationQueue = redisConnection ? new Queue('notifications', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
    },
  },
}) : createDisabledQueue('notifications');

export const emailQueue = redisConnection ? new Queue('email-notifications', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 seconds
    },
    removeOnComplete: {
      age: 86400,
      count: 500,
    },
  },
}) : createDisabledQueue('email-notifications');

export const whatsappQueue = redisConnection ? new Queue('whatsapp-notifications', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000, // Start with 3 seconds
    },
    removeOnComplete: {
      age: 86400,
      count: 500,
    },
  },
}) : createDisabledQueue('whatsapp-notifications');

// Failed jobs queue (for manual inspection and retry)
export const failedQueue = redisConnection ? new Queue('failed-notifications', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1, // No automatic retries
    removeOnFail: {
      age: 2592000, // Keep for 30 days
    },
  },
}) : createDisabledQueue('failed-notifications');

// Job types
export interface NotificationJobData {
  reportId: string;
  recipientId?: string;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  channel: 'email' | 'whatsapp';
  event: 'report_created' | 'report_submitted' | 'report_reviewed' | 'report_approved' | 'report_rejected';
  subject?: string;
  message: string;
  html?: string; // For email
  template?: { // For WhatsApp
    name: string;
    language: { code: string };
    components: Array<{
      type: 'body';
      parameters: Array<{ type: 'text'; text: string }>;
    }>;
  };
  metadata?: Record<string, unknown>;
}

// Export types
export { Job };

// Graceful shutdown
export async function closeRedisConnection() {
  await redisConnection?.quit();
  console.log('Redis connection closed');
}

// Health check
export async function checkRedisHealth(): Promise<boolean> {
  if (!redisConnection) return false;

  try {
    const result = await redisConnection.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('❌ Redis health check failed:', error);
    return false;
  }
}

export { redisConnection };
