import { NextRequest, NextResponse } from 'next/server';
import { authSecurityEventRepository } from '@/lib/auth-security-events';
import { changeReportUserPassword, requireReportUser } from '@/lib/report-auth';

export async function POST(request: NextRequest) {
  let currentUser;
  try {
    currentUser = await requireReportUser(request);
  } catch {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
    await changeReportUserPassword(currentUser.id, body.currentPassword ?? '', body.newPassword ?? '');
    await authSecurityEventRepository.addAudit({
      action: 'password_changed',
      actorId: currentUser.id,
      actorName: currentUser.name,
      details: 'Changed their report account password and cleared any first-login reset requirement.'
    });
    return NextResponse.json({ data: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to change password.' }, { status: 400 });
  }
}
