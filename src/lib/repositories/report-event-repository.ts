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
  details: string | null;
  from_status: string | null;
  to_status: string | null;
  metadata: Record<string, unknown> | string | null;
  created_at: string;
};

type NotificationRow = {
  id: string;
  report_id: string;
  channel: ReportNotificationEntry['channel'];
  event: ReportNotificationEntry['event'];
  recipient_id: string | null;
  recipient_name: string;
  status: string;
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
    details:
      row.details ||
      [row.from_status, row.to_status].filter(Boolean).join(' -> ') ||
      'Activity recorded.',
    createdAt: row.created_at
  };
}

function mapNotificationRow(row: NotificationRow): ReportNotificationEntry {
  return {
    id: row.id,
    reportId: row.report_id,
    channel: row.channel,
    event: row.event,
    recipientUserId: row.recipient_id ?? undefined,
    recipientName: row.recipient_name,
    status: row.status === 'queued' ? 'queued' : 'sent',
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
        ? await queryPostgres<AuditRow>('SELECT * FROM agri_report_audit_log WHERE report_id = $1 ORDER BY created_at DESC', [reportId])
        : await queryPostgres<AuditRow>('SELECT * FROM agri_report_audit_log ORDER BY created_at DESC');
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
        `INSERT INTO agri_report_audit_log (id, report_id, action, actor_id, actor_name, details, metadata, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
        [
          record.id,
          record.reportId,
          record.action,
          record.actorId ?? null,
          record.actorName,
          record.details,
          JSON.stringify({ source: 'legacy-route' }),
          record.createdAt
        ]
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
        ? await queryPostgres<NotificationRow>('SELECT * FROM agri_notifications WHERE report_id = $1 ORDER BY created_at DESC', [reportId])
        : await queryPostgres<NotificationRow>('SELECT * FROM agri_notifications ORDER BY created_at DESC');
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
          `INSERT INTO agri_notifications (
            id, report_id, channel, event, recipient_id, recipient_name, recipient_email, recipient_phone,
            subject, message, status, created_at, updated_at
          )
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
          [
            record.id,
            record.reportId,
            record.channel,
            mapNotificationEvent(record.event),
            record.recipientUserId ?? null,
            record.recipientName,
            null,
            null,
            null,
            record.message,
            record.status,
            record.createdAt,
            record.createdAt
          ]
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

function mapNotificationEvent(event: ReportNotificationEntry['event']) {
  switch (event) {
    case 'report_created':
    case 'report_submitted':
    case 'report_reviewed':
      return event;
    case 'user_invited':
    default:
      return 'report_created';
  }
}
