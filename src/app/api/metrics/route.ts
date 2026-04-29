import { NextRequest, NextResponse } from 'next/server';
import { register, dbConnectionsGauge, activeSessionsGauge, queueDepthGauge } from '../../../lib/monitoring/metrics';
import { getPgPool, queryPostgres } from '../../../lib/postgres';

/**
 * Prometheus Metrics Endpoint
 * GET /api/metrics - Returns metrics in Prometheus format
 * 
 * This endpoint is scraped by Prometheus server
 */

export async function GET(_request: NextRequest) {
  try {
    // Update dynamic metrics
    await updateDynamicMetrics();

    // Get all metrics in Prometheus format
    const metricsText = await register.metrics();

    // Return with correct content type
    return new NextResponse(metricsText, {
      status: 200,
      headers: {
        'Content-Type': register.contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Failed to generate metrics:', error);
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}

/**
 * Update dynamic metrics that require database queries
 */
async function updateDynamicMetrics() {
  try {
    const pool = getPgPool();

    // Update database connections gauge
    const totalConnections = pool.totalCount;
    const idleConnections = pool.idleCount;
    const activeConnections = totalConnections - idleConnections;

    dbConnectionsGauge.set(activeConnections);

    // Update active sessions gauge
    try {
      const sessionsResult = await queryPostgres<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM agri_sessions WHERE expires_at > NOW()"
      );
      activeSessionsGauge.set(parseInt(sessionsResult.rows[0].count));
    } catch {
      // Table might not exist, ignore
    }

    // Update queue depth gauges
    try {
      const { checkRedisHealth } = await import('../../../lib/queue/queue-config');
      const redisHealthy = await checkRedisHealth();

      if (redisHealthy) {
        const { notificationQueue, emailQueue, whatsappQueue } = await import('../../../lib/queue/queue-config');

        const [notifWaiting, emailWaiting, whatsappWaiting] = await Promise.all([
          notificationQueue.getWaitingCount(),
          emailQueue.getWaitingCount(),
          whatsappQueue.getWaitingCount(),
        ]);

        queueDepthGauge.labels('notifications').set(notifWaiting);
        queueDepthGauge.labels('email-notifications').set(emailWaiting);
        queueDepthGauge.labels('whatsapp-notifications').set(whatsappWaiting);
      }
    } catch {
      // Redis might not be available, ignore
    }
  } catch (error) {
    console.warn('Failed to update dynamic metrics:', error);
    // Don't throw - we still want to return whatever metrics we have
  }
}
