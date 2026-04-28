import 'server-only';
import { Pool, QueryResultRow } from 'pg';
import { randomBytes, scryptSync } from 'crypto';
import { runMigrations } from '@/lib/migration-runner';
import { readReportAuditEntries, readReportNotificationEntries } from '@/lib/report-workflow-events';
import { readReports } from '@/lib/reports-persistence';
import { reportAuthSeedUsers } from '@/data/report-users';
import { ReportAuditEntry, ReportNotificationEntry, ReportRecord } from '@/types/domain';

declare global {
  var __taskopsPgPool: Pool | undefined;
  var __taskopsPgInitPromise: Promise<void> | undefined;
}

export function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || null;
}

export function getPgPool(): Pool {
  if (!global.__taskopsPgPool) {
    const dbUrl = getDatabaseUrl();
    if (!dbUrl) {
      throw new Error('DATABASE_URL is not configured. Please set the DATABASE_URL environment variable.');
    }
    
    global.__taskopsPgPool = new Pool({
      connectionString: dbUrl,
      ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000
    });
  }

  return global.__taskopsPgPool;
}

async function insertAgriReport(pool: Pool, report: ReportRecord) {
  await pool.query(
    `INSERT INTO agri_reports (
      id, title, period, role, role_name, category, reporting_window, status,
      author_id, author_name, author_email, reviewer_id, reviewer_name, reviewer_email,
      data, signature, reviewer_signature, review_comments, submitted_at, reviewed_at,
      last_saved_at, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,
      $9,$10,$11,$12,$13,$14,
      $15::jsonb,$16,$17,$18,$19,$20,
      $21,$22,$23
    )
    ON CONFLICT (id) DO NOTHING`,
    [
      report.id,
      report.title,
      report.period,
      report.roleId,
      report.roleName,
      report.category,
      report.reportingWindow,
      report.status,
      report.authorId ?? null,
      report.authorName,
      null,
      report.reviewerId ?? null,
      report.reviewerName,
      null,
      JSON.stringify(report.data),
      report.signature ?? null,
      report.reviewerSignature ?? null,
      report.reviewComments ?? null,
      report.submittedAt ?? null,
      report.reviewedAt ?? null,
      report.lastSavedAt ?? null,
      report.createdAt,
      report.updatedAt
    ]
  );
}

async function insertAgriAuditEntry(pool: Pool, entry: ReportAuditEntry) {
  await pool.query(
    `INSERT INTO agri_report_audit_log (id, report_id, action, actor_id, actor_name, details, metadata, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
     ON CONFLICT (id) DO NOTHING`,
    [
      entry.id,
      entry.reportId,
      entry.action,
      entry.actorId ?? null,
      entry.actorName,
      entry.details,
      JSON.stringify({ source: 'bootstrap-json' }),
      entry.createdAt
    ]
  );
}

function mapLegacyNotificationEvent(event: ReportNotificationEntry['event']) {
  if (event === 'report_created' || event === 'report_submitted' || event === 'report_reviewed') {
    return event;
  }

  return 'report_created';
}

async function insertAgriNotificationEntry(pool: Pool, entry: ReportNotificationEntry) {
  await pool.query(
    `INSERT INTO agri_notifications (
      id, report_id, recipient_id, recipient_name, recipient_email, recipient_phone,
      channel, event, subject, message, status, created_at, updated_at
    )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (id) DO NOTHING`,
    [
      entry.id,
      entry.reportId,
      entry.recipientUserId ?? null,
      entry.recipientName,
      null,
      null,
      entry.channel,
      mapLegacyNotificationEvent(entry.event),
      null,
      entry.message,
      entry.status,
      entry.createdAt,
      entry.createdAt
    ]
  );
}

function mapAuthRoleToAgriRole(role: (typeof reportAuthSeedUsers)[number]['role']) {
  switch (role) {
    case 'admin':
      return 'admin';
    case 'manager':
      return 'manager';
    case 'reviewer':
      return 'reviewer';
    case 'author':
    default:
      return 'field_staff';
  }
}

function mapTeamToCategory(team: string): ReportRecord['category'] {
  const normalized = team.trim().toLowerCase();
  if (normalized.includes('management') || normalized.includes('executive')) return 'Management';
  if (normalized.includes('quality')) return 'Compliance';
  if (normalized.includes('finance')) return 'Admin';
  if (normalized.includes('regional') || normalized.includes('logistics')) return 'Logistics';
  if (normalized.includes('technical')) return 'Technical';
  return 'Field Ops';
}

async function seedAgriUsers(pool: Pool) {
  const count = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM agri_users');
  if (Number(count.rows[0]?.count ?? '0') > 0) return;

  const now = new Date().toISOString();
  for (const user of reportAuthSeedUsers) {
    const salt = randomBytes(16).toString('hex');
    const derived = scryptSync(user.password, salt, 64).toString('hex');
    const passwordHash = `${salt}:${derived}`;

    await pool.query(
      `INSERT INTO agri_users (
        id, email, name, phone, password_hash, role, farm_role, category, wa_opt_in,
        email_notifications, whatsapp_notifications, status, must_change_password, created_at, updated_at
      )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO NOTHING`,
      [
        user.id,
        user.email,
        user.name,
        null,
        passwordHash,
        mapAuthRoleToAgriRole(user.role),
        user.team,
        mapTeamToCategory(user.team),
        false,
        true,
        false,
        'active',
        user.mustChangePassword ?? false,
        now,
        now
      ]
    );
  }
}

async function seedAgriBootstrapData(pool: Pool) {
  const reportCount = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM agri_reports');
  if (Number(reportCount.rows[0]?.count ?? '0') === 0) {
    const reports = await readReports();
    for (const report of reports) {
      await insertAgriReport(pool, report);
    }
  }

  const auditCount = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM agri_report_audit_log');
  if (Number(auditCount.rows[0]?.count ?? '0') === 0) {
    const auditEntries = await readReportAuditEntries();
    for (const entry of auditEntries) {
      await insertAgriAuditEntry(pool, entry);
    }
  }

  const notificationCount = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM agri_notifications');
  if (Number(notificationCount.rows[0]?.count ?? '0') === 0) {
    const notificationEntries = await readReportNotificationEntries();
    for (const entry of notificationEntries) {
      await insertAgriNotificationEntry(pool, entry);
    }
  }
}

async function seedAgriSessionsFromLegacy(pool: Pool) {
  const sessionCount = await pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM agri_sessions');
  if (Number(sessionCount.rows[0]?.count ?? '0') > 0) return;

  const legacySessions = await pool.query<{
    id: string;
    user_id: string;
    token: string;
    expires_at: string;
    created_at: string;
  }>('SELECT * FROM auth_sessions ORDER BY created_at ASC');

  for (const session of legacySessions.rows) {
    await pool.query(
      `INSERT INTO agri_sessions (id, user_id, token, expires_at, created_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO NOTHING`,
      [session.id, session.user_id, session.token, session.expires_at, session.created_at]
    );
  }
}

async function initializeSchema() {
  const pool = getPgPool();
  await runMigrations(pool);
  await seedAgriUsers(pool);
  await seedAgriBootstrapData(pool);
  await seedAgriSessionsFromLegacy(pool);
}

export async function ensurePostgresReady() {
  if (!getDatabaseUrl()) {
    // No database configured, skip initialization
    return;
  }
  
  if (!global.__taskopsPgInitPromise) {
    global.__taskopsPgInitPromise = initializeSchema().catch((error) => {
      console.error('[Postgres] Failed to initialize database:', error.message);
      // Don't throw - allow app to continue with file-based auth
    });
  }

  await global.__taskopsPgInitPromise;
}

export async function queryPostgres<T extends QueryResultRow>(text: string, values?: unknown[]) {
  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not configured');
  }
  
  await ensurePostgresReady();
  
  const pool = getPgPool();
  if (!pool) {
    throw new Error('Database connection not available');
  }
  
  const typedPool = pool as Pool;
  return typedPool.query<T>(text, values);
}
