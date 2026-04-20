import { NextRequest, NextResponse } from 'next/server';
import { authSecurityEventRepository } from '@/lib/auth-security-events';
import { listReportSessions, REPORT_AUTH_COOKIE, requireReportUser, revokeReportSessionById } from '@/lib/report-auth';

export async function GET(request: NextRequest) {
  let currentUser;
  try {
    currentUser = await requireReportUser(request);
  } catch {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const currentToken = request.cookies.get(REPORT_AUTH_COOKIE)?.value ?? null;
    const sessions = await listReportSessions(currentUser.id, currentToken);
    return NextResponse.json({ data: sessions });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load sessions.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  let currentUser;
  try {
    currentUser = await requireReportUser(request);
  } catch {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { sessionId?: string };
    await revokeReportSessionById(currentUser.id, body.sessionId ?? '');
    await authSecurityEventRepository.addAudit({
      action: 'session_revoked',
      actorId: currentUser.id,
      actorName: currentUser.name,
      details: `Revoked session ${body.sessionId ?? 'unknown'} from the Account Security panel.`
    });
    return NextResponse.json({ data: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to revoke session.' }, { status: 400 });
  }
}
