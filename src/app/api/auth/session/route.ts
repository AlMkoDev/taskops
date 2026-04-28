import { NextRequest, NextResponse } from 'next/server';
import { getCurrentReportUser } from '../../../../lib/report-auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentReportUser(request);
    return NextResponse.json({ data: user });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to resolve session.' }, { status: 500 });
  }
}
