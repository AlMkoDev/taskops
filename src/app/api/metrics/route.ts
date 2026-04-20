import { reportEventRepository } from '@/lib/repositories/report-event-repository';
import { reportRepository } from '@/lib/repositories/report-repository';

function metricLine(name: string, value: number, labels?: Record<string, string>) {
  if (!labels || Object.keys(labels).length === 0) {
    return `${name} ${value}`;
  }

  const labelText = Object.entries(labels)
    .map(([key, labelValue]) => `${key}="${labelValue}"`)
    .join(',');

  return `${name}{${labelText}} ${value}`;
}

export async function GET() {
  const [reports, auditEntries, notifications] = await Promise.all([
    reportRepository.list(),
    reportEventRepository.listAudit(),
    reportEventRepository.listNotifications()
  ]);

  const reportStatusCounts = reports.reduce<Record<string, number>>((acc, report) => {
    acc[report.status] = (acc[report.status] ?? 0) + 1;
    return acc;
  }, {});

  const notificationStatusCounts = notifications.reduce<Record<string, number>>((acc, notification) => {
    acc[notification.status] = (acc[notification.status] ?? 0) + 1;
    return acc;
  }, {});

  const lines = [
    '# HELP reports_total Total number of reports',
    '# TYPE reports_total gauge',
    metricLine('reports_total', reports.length),
    '# HELP report_audit_entries_total Total number of report audit entries',
    '# TYPE report_audit_entries_total counter',
    metricLine('report_audit_entries_total', auditEntries.length),
    '# HELP report_notifications_total Total number of report notification records',
    '# TYPE report_notifications_total counter',
    metricLine('report_notifications_total', notifications.length)
  ];

  Object.entries(reportStatusCounts).forEach(([status, count]) => {
    lines.push(metricLine('reports_by_status_total', count, { status }));
  });

  Object.entries(notificationStatusCounts).forEach(([status, count]) => {
    lines.push(metricLine('report_notifications_by_status_total', count, { status }));
  });

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
    }
  });
}
