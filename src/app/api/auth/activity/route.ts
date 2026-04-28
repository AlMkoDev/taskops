import { NextRequest, NextResponse } from 'next/server';
import { authSecurityEventRepository } from '../../../../lib/auth-security-events';
import { canManageReportUsers, requireReportUser } from '../../../../lib/report-auth';

export async function GET(request: NextRequest) {
  let currentUser;
  try {
    currentUser = await requireReportUser(request);
  } catch {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const [auditEntries, notificationEntries] = await Promise.all([
      authSecurityEventRepository.listAudit(),
      authSecurityEventRepository.listNotifications()
    ]);

    if (canManageReportUsers(currentUser) || currentUser.role === 'admin') {
      return NextResponse.json({ data: { auditEntries, notificationEntries } });
    }

    return NextResponse.json({
      data: {
        auditEntries: auditEntries.filter((entry) => entry.actorId === currentUser.id),
        notificationEntries: notificationEntries.filter((entry) => entry.recipientUserId === currentUser.id)
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to load security activity.' }, { status: 400 });
  }
}
