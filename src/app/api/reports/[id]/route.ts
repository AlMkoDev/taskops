import { NextRequest, NextResponse } from 'next/server';
import { AuthUser, ReportRecord } from '../../../../types/domain';
import { requireReportUser } from '../../../../lib/report-auth';
import { reportEventRepository } from '../../../../lib/repositories/report-event-repository';
import { reportRepository } from '../../../../lib/repositories/report-repository';
import { toReportRecord, toReportUpdates } from '../../../../lib/reports-adapter';

function canEditReport(user: AuthUser, report: { authorId?: string }) {
  return user.role === 'admin' || user.role === 'manager' || !report.authorId || user.id === report.authorId;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireReportUser(request);
  } catch {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { id } = await context.params;
  const report = await reportRepository.getById(id);
  if (!report) {
    return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  }

  return NextResponse.json({ data: toReportRecord(report) });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  let currentUser;
  try {
    currentUser = await requireReportUser(request);
  } catch {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as Partial<ReportRecord>;
  const existing = await reportRepository.getById(id);
  if (!existing) {
    return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  }
  if (!canEditReport(currentUser, existing)) {
    return NextResponse.json({ error: 'You do not have permission to update this report.' }, { status: 403 });
  }
  const updated = await reportRepository.update(id, toReportUpdates(body));
  if (!updated) {
    return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  }
  const updatedRecord = toReportRecord(updated);

  const action = body.status === 'draft' && existing.status === 'changes_requested' ? 'reopened' : 'updated';
  await reportEventRepository.addAudit({
    reportId: updatedRecord.id,
    action,
    actorId: currentUser.id,
    actorName: currentUser.name,
    details:
      action === 'reopened'
        ? `${currentUser.name} reopened the report draft after requested changes.`
        : `${currentUser.name} updated report content for ${updatedRecord.reportingWindow}.`
  });

  return NextResponse.json({ data: updatedRecord });
}
