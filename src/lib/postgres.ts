import 'server-only';
import { Pool, QueryResultRow } from 'pg';
import { runMigrations } from '@/lib/migration-runner';
import { readReportAuditEntries, readReportNotificationEntries } from '@/lib/report-workflow-events';
import { readReports } from '@/lib/reports-persistence';
import { ReportAuditEntry, ReportNotificationEntry, ReportRecord } from '@/types/domain';

declare global {
  var __taskopsPgPool: Pool | undefined;
  var __taskopsPgInitPromise: Promise<void> | undefined;
}

export function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || null;
}

function requireDatabaseUrl() {
  const value = getDatabaseUrl();
  if (!value) {
    throw new Error('DATABASE_URL is required for PostgreSQL-backed report storage.');
  }
  return value;
}

export function getPgPool() {
  if (!global.__taskopsPgPool) {
    global.__taskopsPgPool = new Pool({
      connectionString: requireDatabaseUrl(),
      ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });
  }

  return global.__taskopsPgPool;
}

async function insertReport(pool: Pool, report: ReportRecord) {
  await pool.query(
    `INSERT INTO reports (
      id, title, period, role_id, role_name, category, status, author_id, author_name, reviewer_id, reviewer_name, reporting_window,
      submitted_at, reviewed_at, last_saved_at, signature, reviewer_signature, review_comments, data, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
      $13,$14,$15,$16,$17,$18,$19::jsonb,$20,$21
    )
    ON CONFLICT (id) DO NOTHING`,
    [
      report.id,
      report.title,
      report.period,
      report.roleId,
      report.roleName,
      report.category,
      report.status,
      report.authorId ?? null,
      report.authorName,
      report.reviewerId ?? null,
      report.reviewerName,
      report.reportingWindow,
      report.submittedAt ?? null,
      report.reviewedAt ?? null,
      report.lastSavedAt ?? null,
      report.signature ?? null,
      report.reviewerSignature ?? null,
      report.reviewComments ?? null,
      JSON.stringify(report.data),
      report.createdAt,
      report.updatedAt
    ]
  );
}

async function insertAuditEntry(pool: Pool, entry: ReportAuditEntry) {
  await pool.query(
    `INSERT INTO report_audit_entries (id, report_id, action, actor_id, actor_name, details, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO NOTHING`,
    [entry.id, entry.reportId, entry.action, entry.actorId ?? null, entry.actorName, entry.details, entry.createdAt]
  );
}

async function insertNotificationEntry(pool: Pool, entry: ReportNotificationEntry) {
  await pool.query(
    `INSERT INTO report_notification_entries (id, report_id, channel, event, recipient_user_id, recipient_name, status, message, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (id) DO NOTHING`,
    [entry.id, entry.reportId, entry.channel, entry.event, entry.recipientUserId ?? null, entry.recipientName, entry.status, entry.message, entry.createdAt]
  );
}

async function seedLegacyData(pool: Pool) {
  const reports = await readReports();
  for (const report of reports) {
    await insertReport(pool, report);
  }
  const knownReportIds = new Set(reports.map((report) => report.id));

  const auditCount = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM report_audit_entries');
  if (Number(auditCount.rows[0]?.count ?? '0') === 0) {
    const auditEntries = await readReportAuditEntries();
    for (const entry of auditEntries) {
      if (knownReportIds.has(entry.reportId)) {
        await insertAuditEntry(pool, entry);
      }
    }
  }

  const notificationCount = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM report_notification_entries');
  if (Number(notificationCount.rows[0]?.count ?? '0') === 0) {
    const notificationEntries = await readReportNotificationEntries();
    for (const entry of notificationEntries) {
      if (knownReportIds.has(entry.reportId)) {
        await insertNotificationEntry(pool, entry);
      }
    }
  }
}

async function initializeSchema() {
  const pool = getPgPool();
  await runMigrations(pool);
  await seedLegacyData(pool);
}

export async function ensurePostgresReady() {
  if (!global.__taskopsPgInitPromise) {
    global.__taskopsPgInitPromise = initializeSchema();
  }

  await global.__taskopsPgInitPromise;
}

export async function queryPostgres<T extends QueryResultRow>(text: string, values?: unknown[]) {
  await ensurePostgresReady();
  return getPgPool().query<T>(text, values);
}
