import { NextRequest, NextResponse } from 'next/server';
import { AuthUser, ReportRecord } from '@/types/domain';
import { requireReportUser } from '@/lib/report-auth';
import { reportEventRepository } from '@/lib/repositories/report-event-repository';
import { reportRepository } from '@/lib/repositories/report-repository';

function canSubmitReport(user: AuthUser, report: ReportRecord) {
  return user.role === 'admin' || user.role === 'manager' || !report.authorId || user.id === report.authorId;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  let currentUser;
  try {
    currentUser = await requireReportUser(request);
  } catch {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as { signature?: string };
  if (!body.signature) {
    return NextResponse.json({ error: 'Signature is required.' }, { status: 400 });
  }

  const existing = await reportRepository.getById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  }
  if (!canSubmitReport(currentUser, existing)) {
    return NextResponse.json({ error: 'You do not have permission to submit this report.' }, { status: 403 });
  }

  const updated = await reportRepository.submit(id, body.signature);
  if (!updated) {
    return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  }

  await reportEventRepository.addAudit({
    reportId: updated.id,
    action: 'submitted',
    actorId: currentUser.id,
    actorName: currentUser.name,
    details: `${currentUser.name} submitted the report for review.`
  });

  await reportEventRepository.addNotifications([
    {
      reportId: updated.id,
      channel: 'email',
      event: 'report_submitted',
      recipientUserId: updated.reviewerId,
      recipientName: updated.reviewerName,
      status: 'queued',
      message: `${updated.title} is ready for review.`
    },
    {
      reportId: updated.id,
      channel: 'whatsapp',
      event: 'report_submitted',
      recipientUserId: updated.reviewerId,
      recipientName: updated.reviewerName,
      status: 'queued',
      message: `${updated.title} was submitted and needs review.`
    }
  ]);

  return NextResponse.json({ data: updated });
}
