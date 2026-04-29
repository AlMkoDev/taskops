import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';
import { getDatabaseUrl, queryPostgres } from './postgres';
import { ReportAuditEntry, ReportNotificationEntry } from '../types/domain';

const AUTH_SECURITY_STREAM_ID = 'auth_security';
const AUDIT_FILE = path.join(process.cwd(), 'data', 'auth-security-audit.json');
const NOTIFICATIONS_FILE = path.join(process.cwd(), 'data', 'auth-security-notifications.json');

type AuthAuditRow = {
  id: string;
  report_id: string;
  action: ReportAuditEntry['action'];
  actor_id: string | null;
  actor_name: string;
  details: string;
  created_at: string;
};

type AuthNotificationRow = {
  id: string;
  report_id: string;
  channel: ReportNotificationEntry['channel'];
  event: ReportNotificationEntry['event'];
  recipient_user_id: string | null;
  recipient_name: string;
  status: ReportNotificationEntry['status'];
  message: string;
  created_at: string;
};

function shouldFallbackToJson(error: unknown) {
  return error instanceof Error && /(does not exist|relation .* does not exist|column .* does not exist)/i.test(error.message);
}

async function ensureFile(filePath: string) {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, '[]', 'utf8');
  }
}

async function readJsonFile<T>(filePath: string): Promise<T[]> {
  await ensureFile(filePath);
  const contents = await fs.readFile(filePath, 'utf8');
  return JSON.parse(contents) as T[];
}

async function writeJsonFile<T>(filePath: string, records: T[]) {
  await ensureFile(filePath);
  await fs.writeFile(filePath, JSON.stringify(records, null, 2), 'utf8');
}

function mapAuditRow(row: AuthAuditRow): ReportAuditEntry {
  return {
    id: row.id,
    reportId: row.report_id,
    action: row.action,
    actorId: row.actor_id ?? undefined,
    actorName: row.actor_name,
    details: row.details,
    createdAt: row.created_at
  };
}

function mapNotificationRow(row: AuthNotificationRow): ReportNotificationEntry {
  return {
    id: row.id,
    reportId: row.report_id,
    channel: row.channel,
    event: row.event,
    recipientUserId: row.recipient_user_id ?? undefined,
    recipientName: row.recipient_name,
    status: row.status,
    message: row.message,
    createdAt: row.created_at
  };
}

async function readFallbackAuditEntries() {
  return readJsonFile<ReportAuditEntry>(AUDIT_FILE);
}

async function readFallbackNotificationEntries() {
  return readJsonFile<ReportNotificationEntry>(NOTIFICATIONS_FILE);
}

export function buildUserInviteMessage(input: {
  recipientName: string;
  recipientEmail: string;
  temporaryPassword: string;
  inviterName: string;
}) {
  return [
    `Hello ${input.recipientName},`,
    '',
    `${input.inviterName} created your AgriReports access.`,
    `Sign in with ${input.recipientEmail} and temporary password ${input.temporaryPassword}.`,
    'You will be required to change that password on your first login before the Reports workspace unlocks.',
    'If this account was unexpected, contact your farm manager immediately.'
  ].join('\n');
}

export const authSecurityEventRepository = {
  streamId: AUTH_SECURITY_STREAM_ID,
  async listAudit(): Promise<ReportAuditEntry[]> {
    if (!getDatabaseUrl()) {
      return readFallbackAuditEntries();
    }

    try {
      const result = await queryPostgres<AuthAuditRow>('SELECT * FROM auth_audit_entries ORDER BY created_at DESC');
      return result.rows.map(mapAuditRow);
    } catch (error) {
      if (shouldFallbackToJson(error)) {
        return readFallbackAuditEntries();
      }
      throw error;
    }
  },
  async addAudit(entry: Omit<ReportAuditEntry, 'id' | 'createdAt' | 'reportId'>): Promise<ReportAuditEntry> {
    const record: ReportAuditEntry = {
      id: `auth_audit_${Date.now()}`,
      reportId: AUTH_SECURITY_STREAM_ID,
      createdAt: new Date().toISOString(),
      ...entry
    };

    if (!getDatabaseUrl()) {
      const entries = await readFallbackAuditEntries();
      await writeJsonFile(AUDIT_FILE, [record, ...entries]);
      return record;
    }

    try {
      await queryPostgres(
        `INSERT INTO auth_audit_entries (id, report_id, action, actor_id, actor_name, details, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [record.id, record.reportId, record.action, record.actorId ?? null, record.actorName, record.details, record.createdAt]
      );
      return record;
    } catch (error) {
      if (shouldFallbackToJson(error)) {
        const entries = await readFallbackAuditEntries();
        await writeJsonFile(AUDIT_FILE, [record, ...entries]);
        return record;
      }
      throw error;
    }
  },
  async listNotifications(): Promise<ReportNotificationEntry[]> {
    if (!getDatabaseUrl()) {
      return readFallbackNotificationEntries();
    }

    try {
      const result = await queryPostgres<AuthNotificationRow>('SELECT * FROM auth_notification_entries ORDER BY created_at DESC');
      return result.rows.map(mapNotificationRow);
    } catch (error) {
      if (shouldFallbackToJson(error)) {
        return readFallbackNotificationEntries();
      }
      throw error;
    }
  },
  async addNotifications(entriesToAdd: Array<Omit<ReportNotificationEntry, 'id' | 'createdAt' | 'reportId'>>): Promise<ReportNotificationEntry[]> {
    const timestamp = new Date().toISOString();
    const records = entriesToAdd.map((entry, index) => ({
      id: `auth_notify_${Date.now()}_${index}`,
      reportId: AUTH_SECURITY_STREAM_ID,
      createdAt: timestamp,
      ...entry
    }));

    if (!getDatabaseUrl()) {
      const existing = await readFallbackNotificationEntries();
      await writeJsonFile(NOTIFICATIONS_FILE, [...records, ...existing]);
      return records;
    }

    try {
      for (const record of records) {
        await queryPostgres(
          `INSERT INTO auth_notification_entries (id, report_id, channel, event, recipient_user_id, recipient_name, status, message, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [record.id, record.reportId, record.channel, record.event, record.recipientUserId ?? null, record.recipientName, record.status, record.message, record.createdAt]
        );
      }
      return records;
    } catch (error) {
      if (shouldFallbackToJson(error)) {
        const existing = await readFallbackNotificationEntries();
        await writeJsonFile(NOTIFICATIONS_FILE, [...records, ...existing]);
        return records;
      }
      throw error;
    }
  }
};
