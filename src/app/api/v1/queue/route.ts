import { NextRequest, NextResponse } from 'next/server';
import {
  notificationQueue,
  emailQueue,
  whatsappQueue,
  failedQueue,
  checkRedisHealth,
} from '../../../../lib/queue/queue-config';

/**
 * Queue Monitoring API
 * GET /api/v1/queue/stats - Get queue statistics
 * GET /api/v1/queue/health - Check queue health
 * POST /api/v1/queue/retry/:jobId - Retry a failed job
 * DELETE /api/v1/queue/clear/:queueName - Clear a queue
 */

export async function GET(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    // Health check endpoint
    if (pathname === '/api/v1/queue/health') {
      const redisHealthy = await checkRedisHealth();
      
      return NextResponse.json({
        status: redisHealthy ? 'healthy' : 'unhealthy',
        redis: redisHealthy,
        timestamp: new Date().toISOString(),
      });
    }

    // Queue statistics endpoint
    if (pathname === '/api/v1/queue/stats') {
      const stats = await getQueueStats();
      
      return NextResponse.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: 'Not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Queue API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch queue data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Retry failed job
  const retryMatch = pathname.match(/^\/api\/v1\/queue\/retry\/(.+)$/);
  if (retryMatch) {
    const jobId = retryMatch[1];
    return await retryFailedJob(jobId);
  }

  return NextResponse.json(
    { success: false, error: 'Not found' },
    { status: 404 }
  );
}

export async function DELETE(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Clear queue
  const clearMatch = pathname.match(/^\/api\/v1\/queue\/clear\/(.+)$/);
  if (clearMatch) {
    const queueName = clearMatch[1];
    return await clearQueue(queueName);
  }

  return NextResponse.json(
    { success: false, error: 'Not found' },
    { status: 404 }
  );
}

// Helper: Get queue statistics
async function getQueueStats() {
  const [
    notificationWaiting,
    notificationActive,
    notificationCompleted,
    notificationFailed,
    emailWaiting,
    emailActive,
    emailCompleted,
    emailFailed,
    whatsappWaiting,
    whatsappActive,
    whatsappCompleted,
    whatsappFailed,
    failedJobs,
  ] = await Promise.all([
    notificationQueue.getWaitingCount(),
    notificationQueue.getActiveCount(),
    notificationQueue.getCompletedCount(),
    notificationQueue.getFailedCount(),
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    whatsappQueue.getWaitingCount(),
    whatsappQueue.getActiveCount(),
    whatsappQueue.getCompletedCount(),
    whatsappQueue.getFailedCount(),
    failedQueue.getWaitingCount(),
  ]);

  // Get recent failed jobs
  const recentFailed = await failedQueue.getJobs(['failed'], 0, 9);
  const failedJobsList = await Promise.all(
    recentFailed.map(async (job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn,
      attemptsMade: job.attemptsMade,
    }))
  );

  return {
    notifications: {
      waiting: notificationWaiting,
      active: notificationActive,
      completed: notificationCompleted,
      failed: notificationFailed,
    },
    email: {
      waiting: emailWaiting,
      active: emailActive,
      completed: emailCompleted,
      failed: emailFailed,
    },
    whatsapp: {
      waiting: whatsappWaiting,
      active: whatsappActive,
      completed: whatsappCompleted,
      failed: whatsappFailed,
    },
    failedJobs: {
      total: failedJobs,
      recent: failedJobsList,
    },
    summary: {
      totalWaiting: notificationWaiting + emailWaiting + whatsappWaiting,
      totalActive: notificationActive + emailActive + whatsappActive,
      totalFailed: notificationFailed + emailFailed + whatsappFailed + failedJobs,
      health: (notificationWaiting + emailWaiting + whatsappWaiting) < 1000 ? 'healthy' : 'warning',
    },
  };
}

// Helper: Retry a failed job
async function retryFailedJob(jobId: string) {
  try {
    // Get job from failed queue
    const jobs = await failedQueue.getJobs(['failed']);
    const job = jobs.find((j) => j.id === jobId);

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    // Retry by adding to original queue
    const originalQueue = job.data.channel === 'email' ? emailQueue : whatsappQueue;
    await originalQueue.add(job.name, job.data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });

    // Remove from failed queue
    await job.remove();

    return NextResponse.json({
      success: true,
      message: 'Job queued for retry',
      jobId,
    });
  } catch (error) {
    console.error('Retry error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retry job' },
      { status: 500 }
    );
  }
}

// Helper: Clear a queue
async function clearQueue(queueName: string) {
  try {
    let queue;
    switch (queueName) {
      case 'notifications':
        queue = notificationQueue;
        break;
      case 'email':
        queue = emailQueue;
        break;
      case 'whatsapp':
        queue = whatsappQueue;
        break;
      case 'failed':
        queue = failedQueue;
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Unknown queue' },
          { status: 400 }
        );
    }

    await queue.obliterate({ force: true });

    return NextResponse.json({
      success: true,
      message: `Queue ${queueName} cleared`,
    });
  } catch (error) {
    console.error('Clear queue error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear queue' },
      { status: 500 }
    );
  }
}
