import { NextResponse } from 'next/server';
import { reportEventRepository } from '@/lib/repositories/report-event-repository';
import { reportRepository } from '@/lib/repositories/report-repository';

export async function GET() {
  const [reports, auditEntries, notificationEntries] = await Promise.all([
    reportRepository.list(),
    reportEventRepository.listAudit(),
    reportEventRepository.listNotifications()
  ]);

  return NextResponse.json({
    status: 'ok',
    service: 'taskops-agrireports',
    version: '0.1.0',
    uptimeSeconds: Math.round(process.uptime()),
    reports: reports.length,
    auditEntries: auditEntries.length,
    notifications: notificationEntries.length
  });
}
