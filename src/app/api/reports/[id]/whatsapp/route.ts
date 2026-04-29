import { NextRequest, NextResponse } from 'next/server';
import { requireReportUser } from '../../../../../lib/report-auth';
import { reportEventRepository } from '../../../../../lib/repositories/report-event-repository';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireReportUser(request);
  } catch {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { id } = await context.params;
  const entries = await reportEventRepository.listWhatsAppMessages(id);
  return NextResponse.json({ data: entries });
}
