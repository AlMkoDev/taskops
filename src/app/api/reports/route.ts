import { NextRequest, NextResponse } from 'next/server';
import { requireReportUser, resolveReportUser } from '@/lib/report-auth';
import { reportEventRepository } from '@/lib/repositories/report-event-repository';
import { reportRepository } from '@/lib/repositories/report-repository';
import { toReportRecord } from '@/lib/reports-adapter';
import { ReportRecord } from '@/types/domain';

type CreateBody = Pick<ReportRecord, 'title' | 'period' | 'roleId' | 'roleName' | 'category' | 'reviewerId' | 'reviewerName' | 'reportingWindow' | 'data'>;

export async function GET(request: NextRequest) {
  try {
    await requireReportUser(request);
  } catch {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const reports = await reportRepository.list();
  return NextResponse.json({ data: reports.map(toReportRecord) });
}

export async function POST(request: NextRequest) {
  let currentUser;
  try {
    currentUser = await requireReportUser(request);
  } catch {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const body = (await request.json()) as Partial<CreateBody>;
  if (!body.title || !body.period || !body.roleId || !body.roleName || !body.category || !body.reportingWindow) {
    return NextResponse.json({ error: 'Missing required report fields.' }, { status: 400 });
  }

  const reviewer =
    (await resolveReportUser({
      userId: body.reviewerId,
      name: body.reviewerName
    })) ?? null;

  const created = await reportRepository.create({
    title: body.title,
    period: body.period,
    role: body.roleId,
    roleName: body.roleName,
    category: body.category,
    status: 'draft',
    author: {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email
    },
    authorId: currentUser.id,
    authorName: currentUser.name,
    reviewerId: reviewer?.id,
    reviewerName: reviewer?.name ?? body.reviewerName ?? 'Reviewer',
    reportingWindow: body.reportingWindow,
    data: body.data || {}
  });
  const createdRecord = toReportRecord(created);

  await reportEventRepository.addAudit({
    reportId: created.id,
    action: 'created',
    actorId: currentUser.id,
    actorName: currentUser.name,
    details: `Created ${createdRecord.period} ${createdRecord.roleName} report for ${createdRecord.reportingWindow} (authenticated actor).`
  });

  await reportEventRepository.addNotifications([
    {
      reportId: createdRecord.id,
      channel: 'in_app',
      event: 'report_created',
      recipientUserId: reviewer?.id,
      recipientName: createdRecord.reviewerName,
      status: 'queued',
      message: `${createdRecord.authorName} created ${createdRecord.title}.`
    }
  ]);

  return NextResponse.json({ data: createdRecord }, { status: 201 });
}
