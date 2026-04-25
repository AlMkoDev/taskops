import { NextRequest, NextResponse } from 'next/server';
import { authenticateReportUser, createReportSession, setReportSessionCookie } from '@/lib/report-auth';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };

    if (!body.email || !body.password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const user = await authenticateReportUser(body.email, body.password);

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    const session = await createReportSession(user.id);

    const response = NextResponse.json({ data: user });
    setReportSessionCookie(response, session);
    return response;
  } catch (error) {
    console.error('[Login] ERROR:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Authentication failed.' }, { status: 500 });
  }
}
