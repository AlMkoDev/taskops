import { NextRequest, NextResponse } from 'next/server';
import { authSecurityEventRepository, buildUserInviteMessage } from '../../../../lib/auth-security-events';
import { canManageReportUsers, listReportUsers, requireReportUser, saveReportUser } from '../../../../lib/report-auth';
import { AuthUser } from '../../../../types/domain';

export async function GET(request: NextRequest) {
  try {
    await requireReportUser(request);
  } catch {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const users = await listReportUsers();
  return NextResponse.json({ data: users });
}

type SaveUserBody = {
  id?: string;
  email?: string;
  name?: string;
  role?: AuthUser['role'];
  team?: string;
  status?: AuthUser['status'];
  password?: string;
};

export async function POST(request: NextRequest) {
  let currentUser;
  try {
    currentUser = await requireReportUser(request);
  } catch {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  if (!canManageReportUsers(currentUser)) {
    return NextResponse.json({ error: 'Only managers can manage report users.' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as SaveUserBody;
    if (!body.email || !body.name || !body.role || !body.team || !body.status) {
      return NextResponse.json({ error: 'Name, email, role, team, and status are required.' }, { status: 400 });
    }

    const saved = await saveReportUser({
      id: body.id,
      email: body.email,
      name: body.name,
      role: body.role,
      team: body.team,
      status: body.status,
      password: body.password
    });

    const isNewUser = !body.id;
    const isPasswordReset = Boolean(body.id && body.password);

    if (isNewUser) {
      const inviteMessage = buildUserInviteMessage({
        recipientName: saved.name,
        recipientEmail: saved.email,
        temporaryPassword: body.password ?? '',
        inviterName: currentUser.name
      });

      await Promise.all([
        authSecurityEventRepository.addAudit({
          action: 'user_invited',
          actorId: currentUser.id,
          actorName: currentUser.name,
          details: `Created ${saved.name} (${saved.email}) and queued onboarding invites with temporary-password instructions.`
        }),
        authSecurityEventRepository.addNotifications([
          {
            channel: 'email',
            event: 'user_invited',
            recipientUserId: saved.id,
            recipientName: saved.name,
            status: 'queued',
            message: inviteMessage
          },
          {
            channel: 'whatsapp',
            event: 'user_invited',
            recipientUserId: saved.id,
            recipientName: saved.name,
            status: 'queued',
            message: inviteMessage
          }
        ])
      ]);
    }

    if (isPasswordReset) {
      await authSecurityEventRepository.addAudit({
        action: 'password_reset',
        actorId: currentUser.id,
        actorName: currentUser.name,
        details: `Reset the password for ${saved.name} (${saved.email}) and forced a password change at next sign-in.`
      });
    }

    return NextResponse.json({
      data: saved,
      meta: {
        inviteQueued: isNewUser,
        passwordResetLogged: isPasswordReset
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save user.' }, { status: 400 });
  }
}
