import 'server-only';
import client from 'prom-client';

// Create a Registry
export const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({
  register,
  prefix: 'agrireports_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // Garbage collection buckets
});

// ============================================================
// HTTP Metrics
// ============================================================

// HTTP request duration histogram
export const httpDurationHistogram = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10], // 10ms to 10s
});

// HTTP request counter
export const httpRequestsCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// HTTP errors counter
export const httpErrorsCounter = new client.Counter({
  name: 'http_errors_total',
  help: 'Total number of HTTP errors (4xx and 5xx)',
  labelNames: ['method', 'route', 'status_code', 'error_type'],
  registers: [register],
});

// ============================================================
// Report Metrics
// ============================================================

// Reports created counter
export const reportsCreatedCounter = new client.Counter({
  name: 'reports_created_total',
  help: 'Total number of reports created',
  labelNames: ['period', 'category', 'role'],
  registers: [register],
});

// Reports submitted counter
export const reportsSubmittedCounter = new client.Counter({
  name: 'reports_submitted_total',
  help: 'Total number of reports submitted for review',
  labelNames: ['period', 'category'],
  registers: [register],
});

// Reports reviewed counter
export const reportsReviewedCounter = new client.Counter({
  name: 'reports_reviewed_total',
  help: 'Total number of reports reviewed',
  labelNames: ['decision'], // approved, rejected, changes_requested
  registers: [register],
});

// Report processing time histogram
export const reportProcessingTimeHistogram = new client.Histogram({
  name: 'report_processing_time_seconds',
  help: 'Time from report creation to submission',
  labelNames: ['period'],
  registers: [register],
  buckets: [300, 1800, 3600, 7200, 14400, 28800, 86400], // 5min to 1 day
});

// ============================================================
// Notification Metrics
// ============================================================

// Notifications sent counter
export const notificationsSentCounter = new client.Counter({
  name: 'notifications_sent_total',
  help: 'Total number of notifications sent',
  labelNames: ['channel', 'event', 'status'],
  registers: [register],
});

// Notification delivery time histogram
export const notificationDeliveryTimeHistogram = new client.Histogram({
  name: 'notification_delivery_time_seconds',
  help: 'Time to send a notification',
  labelNames: ['channel'],
  registers: [register],
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10], // 100ms to 10s
});

// Notification failures counter
export const notificationFailuresCounter = new client.Counter({
  name: 'notification_failures_total',
  help: 'Total number of notification failures',
  labelNames: ['channel', 'error_type'],
  registers: [register],
});

// ============================================================
// Queue Metrics
// ============================================================

// Queue jobs counter
export const queueJobsCounter = new client.Counter({
  name: 'queue_jobs_total',
  help: 'Total number of queue jobs processed',
  labelNames: ['queue_name', 'status'], // status: completed, failed
  registers: [register],
});

// Queue job duration histogram
export const queueJobDurationHistogram = new client.Histogram({
  name: 'queue_job_duration_seconds',
  help: 'Duration of queue job processing',
  labelNames: ['queue_name', 'job_type'],
  registers: [register],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30], // 100ms to 30s
});

// Queue depth gauge
export const queueDepthGauge = new client.Gauge({
  name: 'queue_depth',
  help: 'Current number of jobs waiting in queue',
  labelNames: ['queue_name'],
  registers: [register],
});

// ============================================================
// Database Metrics
// ============================================================

// Database query duration histogram
export const dbQueryDurationHistogram = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation', 'table'],
  registers: [register],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5], // 10ms to 5s
});

// Database connections gauge
export const dbConnectionsGauge = new client.Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections',
  registers: [register],
});

// ============================================================
// Authentication Metrics
// ============================================================

// Login attempts counter
export const loginAttemptsCounter = new client.Counter({
  name: 'auth_login_attempts_total',
  help: 'Total number of login attempts',
  labelNames: ['status'], // success, failed
  registers: [register],
});

// Active sessions gauge
export const activeSessionsGauge = new client.Gauge({
  name: 'auth_active_sessions',
  help: 'Number of active user sessions',
  registers: [register],
});

// ============================================================
// Custom Metrics
// ============================================================

// Application info gauge
export const appInfoGauge = new client.Gauge({
  name: 'app_info',
  help: 'Application information',
  labelNames: ['version', 'environment', 'node_version'],
  registers: [register],
});

// Set app info
appInfoGauge.set(
  {
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    node_version: process.version,
  },
  1
);

// ============================================================
// Helper Functions
// ============================================================

/**
 * Record HTTP request metrics
 */
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  durationSeconds: number,
  isError: boolean = false
): void {
  httpDurationHistogram
    .labels(method, route, statusCode.toString())
    .observe(durationSeconds);

  httpRequestsCounter
    .labels(method, route, statusCode.toString())
    .inc();

  if (isError) {
    httpErrorsCounter
      .labels(method, route, statusCode.toString(), statusCode >= 500 ? 'server_error' : 'client_error')
      .inc();
  }
}

/**
 * Record report creation
 */
export function recordReportCreated(
  period: string,
  category: string,
  role: string
): void {
  reportsCreatedCounter.labels(period, category, role).inc();
}

/**
 * Record report submission
 */
export function recordReportSubmitted(period: string, category: string): void {
  reportsSubmittedCounter.labels(period, category).inc();
}

/**
 * Record report review
 */
export function recordReportReviewed(decision: 'approved' | 'rejected' | 'changes_requested'): void {
  reportsReviewedCounter.labels(decision).inc();
}

/**
 * Record notification sent
 */
export function recordNotificationSent(
  channel: 'email' | 'whatsapp',
  event: string,
  status: 'success' | 'failed'
): void {
  notificationsSentCounter.labels(channel, event, status).inc();
}

/**
 * Record notification failure
 */
export function recordNotificationFailure(
  channel: 'email' | 'whatsapp',
  errorType: string
): void {
  notificationFailuresCounter.labels(channel, errorType).inc();
}

/**
 * Record queue job
 */
export function recordQueueJob(
  queueName: string,
  jobType: string,
  status: 'completed' | 'failed',
  durationSeconds: number
): void {
  queueJobsCounter.labels(queueName, status).inc();
  queueJobDurationHistogram.labels(queueName, jobType).observe(durationSeconds);
}

/**
 * Record database query
 */
export function recordDbQuery(
  operation: string,
  table: string,
  durationSeconds: number
): void {
  dbQueryDurationHistogram.labels(operation, table).observe(durationSeconds);
}

/**
 * Record login attempt
 */
export function recordLoginAttempt(status: 'success' | 'failed'): void {
  loginAttemptsCounter.labels(status).inc();
}

// Export registry as default
export default register;
