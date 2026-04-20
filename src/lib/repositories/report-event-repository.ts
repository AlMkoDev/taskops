import 'server-only';
import { getDatabaseUrl, queryPostgres } from '@/lib/postgres';
import {
  appendReportAuditEntry,
  appendReportNotificationEntries,
  readReportAuditEntries,
  readReportNotificationEntries
} from '@/lib/report-workflow-events';
import { ReportAuditEntry, ReportNotificationEntry } from '@/types/domain';

function shouldFallbackToJson(error: unknown) {
  return error instanceof Error && /(does not exist|relation .* does not exist|column .* does not exist)/i.test(error.message);
}

type AuditRow = {
  id: string;
  report_id: string;
  action: ReportAuditEntry['action'];
  actor_id: string | null;
  actor_name: string;
  details: string;
  created_at: string;
};

type NotificationRow = {
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

function mapAuditRow(row: AuditRow): ReportAuditEntry {
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

function mapNotificationRow(row: NotificationRow): ReportNotificationEntry {
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

export const reportEventRepository = {
  async listAudit(reportId?: string): Promise<ReportAuditEntry[]> {
    if (!getDatabaseUrl()) {
      return readReportAuditEntries(reportId);
    }
    try {
      const result = reportId
        ? await queryPostgres<AuditRow>('SELECT * FROM report_audit_entries WHERE report_id = $1 ORDER BY created_at DESC', [reportId])
        : await queryPostgres<AuditRow>('SELECT * FROM report_audit_entries ORDER BY created_at DESC');
      return result.rows.map(mapAuditRow);
    } catch (error) {
      if (shouldFallbackToJson(error)) {
        return readReportAuditEntries(reportId);
      }
      throw error;
    }
  },
  async addAudit(entry: Omit<ReportAuditEntry, 'id' | 'createdAt'>): Promise<ReportAuditEntry> {
    if (!getDatabaseUrl()) {
      return appendReportAuditEntry(entry);
    }
    const record: ReportAuditEntry = {
      id: `audit_${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...entry
    };
    try {
      await queryPostgres(
        `INSERT INTO report_audit_entries (id, report_id, action, actor_id, actor_name, details, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [record.id, record.reportId, record.action, record.actorId ?? null, record.actorName, record.details, record.createdAt]
      );
    } catch (error) {
      if (shouldFallbackToJson(error)) {
        return appendReportAuditEntry(entry);
      }
      throw error;
    }
    return record;
  },
  async listNotifications(reportId?: string): Promise<ReportNotificationEntry[]> {
    if (!getDatabaseUrl()) {
      return readReportNotificationEntries(reportId);
    }
    try {
      const result = reportId
        ? await queryPostgres<NotificationRow>('SELECT * FROM report_notification_entries WHERE report_id = $1 ORDER BY created_at DESC', [reportId])
        : await queryPostgres<NotificationRow>('SELECT * FROM report_notification_entries ORDER BY created_at DESC');
      return result.rows.map(mapNotificationRow);
    } catch (error) {
      if (shouldFallbackToJson(error)) {
        return readReportNotificationEntries(reportId);
      }
      throw error;
    }
  },
  async addNotifications(entries: Array<Omit<ReportNotificationEntry, 'id' | 'createdAt'>>): Promise<ReportNotificationEntry[]> {
    if (!getDatabaseUrl()) {
      return appendReportNotificationEntries(entries);
    }
    const records = entries.map((entry, index) => ({
      id: `notify_${Date.now()}_${index}`,
      createdAt: new Date().toISOString(),
      ...entry
    }));

    try {
      for (const record of records) {
        await queryPostgres(
          `INSERT INTO report_notification_entries (id, report_id, channel, event, recipient_user_id, recipient_name, status, message, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [record.id, record.reportId, record.channel, record.event, record.recipientUserId ?? null, record.recipientName, record.status, record.message, record.createdAt]
        );
      }
    } catch (error) {
      if (shouldFallbackToJson(error)) {
        return appendReportNotificationEntries(entries);
      }
      throw error;
    }

    return records;
  }
};
