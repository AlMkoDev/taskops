import { NextRequest, NextResponse } from 'next/server';
import { requireReportUser } from '@/lib/report-auth';
import { reportEventRepository } from '@/lib/repositories/report-event-repository';
import { reportRepository } from '@/lib/repositories/report-repository';
import { AuthUser, ReportRecord, ReportReviewAction } from '@/types/domain';

function canReviewReport(user: AuthUser, report: ReportRecord) {
  return user.role === 'admin' || user.role === 'manager' || !report.reviewerId || user.id === report.reviewerId;
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  let currentUser;
  try {
    currentUser = await requireReportUser(request);
  } catch {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as { action?: ReportReviewAction; comments?: string; signature?: string };
  if (!body.action) {
    return NextResponse.json({ error: 'Review action is required.' }, { status: 400 });
  }

  if (body.action === 'approve' && !body.signature) {
    return NextResponse.json({ error: 'Reviewer signature is required for approval.' }, { status: 400 });
  }

  const existing = await reportRepository.getById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  }
  if (!canReviewReport(currentUser, existing)) {
    return NextResponse.json({ error: 'You do not have permission to review this report.' }, { status: 403 });
  }

  const updated = await reportRepository.review(id, body.action, {
    comments: body.comments,
    signature: body.signature
  });

  if (!updated) {
    return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  }

  const auditAction = body.action === 'approve' ? 'approved' : body.action === 'reject' ? 'rejected' : 'changes_requested';

  await reportEventRepository.addAudit({
    reportId: updated.id,
    action: auditAction,
    actorId: currentUser.id,
    actorName: currentUser.name,
    details:
      body.action === 'approve'
        ? `${currentUser.name} approved the report.`
        : body.action === 'reject'
          ? `${currentUser.name} rejected the report.`
          : `${currentUser.name} requested changes on the report.`
  });

  await reportEventRepository.addNotifications([
    {
      reportId: updated.id,
      channel: 'email',
      event: 'report_reviewed',
      recipientUserId: updated.authorId,
      recipientName: updated.authorName,
      status: 'queued',
      message: `${updated.title} was ${body.action.replace('_', ' ')} by ${updated.reviewerName}.`
    },
    {
      reportId: updated.id,
      channel: 'in_app',
      event: 'report_reviewed',
      recipientUserId: updated.authorId,
      recipientName: updated.authorName,
      status: 'queued',
      message: `${updated.title} review outcome: ${body.action.replace('_', ' ')}.`
    }
  ]);

  return NextResponse.json({ data: updated });
}
