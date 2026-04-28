import { NextRequest, NextResponse } from 'next/server';
import { clearReportSessionCookie, revokeReportSession } from '../../../../lib/report-auth';

export async function POST(request: NextRequest) {
  await revokeReportSession(request);
  const response = NextResponse.json({ data: true });
  clearReportSessionCookie(response);
  return response;
}

