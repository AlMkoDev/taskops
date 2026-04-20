import 'server-only';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { reportAuthSeedUsers } from '@/data/report-users';
import { getDatabaseUrl, queryPostgres } from '@/lib/postgres';
import { AuthSession, AuthSessionView, AuthUser } from '@/types/domain';

export const REPORT_AUTH_COOKIE = 'taskops_report_session';

type SaveReportUserInput = {
  id?: string;
  email: string;
  name: string;
  role: AuthUser['role'];
  team: string;
  status: AuthUser['status'];
  password?: string;
};

type StoredAuthUser = AuthUser & {
  passwordHash: string;
};

type StoredAuthSession = AuthSession;

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: AuthUser['role'];
  team: string;
  status: AuthUser['status'];
  must_change_password?: boolean;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

type SessionRow = {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
};

const USERS_FILE = path.join(process.cwd(), 'data', 'auth-users.json');
const SESSIONS_FILE = path.join(process.cwd(), 'data', 'auth-sessions.json');
const SESSION_TTL_DAYS = 14;

function shouldFallbackToFileAuth(error: unknown) {
  return error instanceof Error && /(does not exist|relation .* does not exist|column .* does not exist)/i.test(error.message);
}

function mapUserRow(row: UserRow): StoredAuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    team: row.team,
    status: row.status,
    mustChangePassword: row.must_change_password ?? false,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSessionRow(row: SessionRow): StoredAuthSession {
  return {
    id: row.id,
    userId: row.user_id,
    token: row.token,
    expiresAt: row.expires_at,
    createdAt: row.created_at
  };
}

function toPublicUser(user: StoredAuthUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    team: user.team,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, expected] = storedHash.split(':');
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(Buffer.from(expected, 'hex'), actual);
}

async function ensureJsonFile(filePath: string, fallbackValue: string) {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, fallbackValue, 'utf8');
  }
}

async function readJson<T>(filePath: string, fallbackValue: string) {
  await ensureJsonFile(filePath, fallbackValue);
  const contents = await fs.readFile(filePath, 'utf8');
  return JSON.parse(contents) as T;
}

async function writeJson<T>(filePath: string, value: T) {
  await ensureJsonFile(filePath, Array.isArray(value) ? '[]' : '{}');
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

async function ensureFallbackUsersSeeded() {
  const users = await readJson<StoredAuthUser[]>(USERS_FILE, '[]');
  if (users.length > 0) return users;

  const now = new Date().toISOString();
  const seededUsers: StoredAuthUser[] = reportAuthSeedUsers.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    team: user.team,
    status: 'active',
    mustChangePassword: user.mustChangePassword ?? false,
    passwordHash: hashPassword(user.password),
    createdAt: now,
    updatedAt: now
  }));

  await writeJson(USERS_FILE, seededUsers);
  return seededUsers;
}

async function listFallbackUsers() {
  return ensureFallbackUsersSeeded();
}

async function listFallbackSessions() {
  return readJson<StoredAuthSession[]>(SESSIONS_FILE, '[]');
}

async function writeFallbackSessions(sessions: StoredAuthSession[]) {
  await writeJson(SESSIONS_FILE, sessions);
}

async function ensureDatabaseUsersSeeded() {
  const result = await queryPostgres<{ count: string }>('SELECT COUNT(*)::text AS count FROM auth_users');
  if (Number(result.rows[0]?.count ?? '0') > 0) return;

  const now = new Date().toISOString();
  for (const user of reportAuthSeedUsers) {
    await queryPostgres(
      `INSERT INTO auth_users (id, email, name, role, team, status, must_change_password, password_hash, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO NOTHING`,
      [user.id, user.email, user.name, user.role, user.team, 'active', user.mustChangePassword ?? false, hashPassword(user.password), now, now]
    );
  }
}

async function listDatabaseUsers() {
  try {
    await ensureDatabaseUsersSeeded();
    const result = await queryPostgres<UserRow>('SELECT * FROM auth_users ORDER BY name ASC');
    return result.rows.map(mapUserRow);
  } catch (error) {
    if (shouldFallbackToFileAuth(error)) {
      return listFallbackUsers();
    }
    throw error;
  }
}

async function findStoredUserByEmail(email: string) {
  if (!getDatabaseUrl()) {
    const users = await listFallbackUsers();
    return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  await ensureDatabaseUsersSeeded();
  try {
    const result = await queryPostgres<UserRow>('SELECT * FROM auth_users WHERE lower(email) = lower($1) LIMIT 1', [email]);
    return result.rows[0] ? mapUserRow(result.rows[0]) : null;
  } catch (error) {
    if (shouldFallbackToFileAuth(error)) {
      const users = await listFallbackUsers();
      return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
    }
    throw error;
  }
}

async function findStoredUserById(id: string) {
  if (!getDatabaseUrl()) {
    const users = await listFallbackUsers();
    return users.find((user) => user.id === id) ?? null;
  }

  await ensureDatabaseUsersSeeded();
  try {
    const result = await queryPostgres<UserRow>('SELECT * FROM auth_users WHERE id = $1 LIMIT 1', [id]);
    return result.rows[0] ? mapUserRow(result.rows[0]) : null;
  } catch (error) {
    if (shouldFallbackToFileAuth(error)) {
      const users = await listFallbackUsers();
      return users.find((user) => user.id === id) ?? null;
    }
    throw error;
  }
}

async function findStoredUserByName(name: string) {
  if (!getDatabaseUrl()) {
    const users = await listFallbackUsers();
    return users.find((user) => user.name.toLowerCase() === name.toLowerCase()) ?? null;
  }

  await ensureDatabaseUsersSeeded();
  try {
    const result = await queryPostgres<UserRow>('SELECT * FROM auth_users WHERE lower(name) = lower($1) LIMIT 1', [name]);
    return result.rows[0] ? mapUserRow(result.rows[0]) : null;
  } catch (error) {
    if (shouldFallbackToFileAuth(error)) {
      const users = await listFallbackUsers();
      return users.find((user) => user.name.toLowerCase() === name.toLowerCase()) ?? null;
    }
    throw error;
  }
}

async function listStoredUsers() {
  return getDatabaseUrl() ? listDatabaseUsers() : listFallbackUsers();
}

function buildUserId() {
  return `user_${Date.now()}`;
}

async function createStoredSession(userId: string) {
  const now = new Date();
  const session: StoredAuthSession = {
    id: `session_${Date.now()}`,
    userId,
    token: randomBytes(32).toString('hex'),
    expiresAt: new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: now.toISOString()
  };

  if (!getDatabaseUrl()) {
    const sessions = await listFallbackSessions();
    await writeFallbackSessions([session, ...sessions.filter((entry) => entry.userId !== userId)]);
    return session;
  }

  try {
    await queryPostgres(
      `INSERT INTO auth_sessions (id, user_id, token, expires_at, created_at)
       VALUES ($1,$2,$3,$4,$5)`,
      [session.id, session.userId, session.token, session.expiresAt, session.createdAt]
    );
  } catch (error) {
    if (shouldFallbackToFileAuth(error)) {
      const sessions = await listFallbackSessions();
      await writeFallbackSessions([session, ...sessions.filter((entry) => entry.userId !== userId)]);
      return session;
    }
    throw error;
  }
  return session;
}

async function findStoredSessionByToken(token: string) {
  if (!getDatabaseUrl()) {
    const sessions = await listFallbackSessions();
    return sessions.find((session) => session.token === token) ?? null;
  }

  try {
    const result = await queryPostgres<SessionRow>('SELECT * FROM auth_sessions WHERE token = $1 LIMIT 1', [token]);
    return result.rows[0] ? mapSessionRow(result.rows[0]) : null;
  } catch (error) {
    if (shouldFallbackToFileAuth(error)) {
      const sessions = await listFallbackSessions();
      return sessions.find((session) => session.token === token) ?? null;
    }
    throw error;
  }
}

async function deleteStoredSession(token: string) {
  if (!getDatabaseUrl()) {
    const sessions = await listFallbackSessions();
    await writeFallbackSessions(sessions.filter((session) => session.token !== token));
    return;
  }

  try {
    await queryPostgres('DELETE FROM auth_sessions WHERE token = $1', [token]);
  } catch (error) {
    if (shouldFallbackToFileAuth(error)) {
      const sessions = await listFallbackSessions();
      await writeFallbackSessions(sessions.filter((session) => session.token !== token));
      return;
    }
    throw error;
  }
}

async function pruneExpiredSessions() {
  const now = new Date().toISOString();
  if (!getDatabaseUrl()) {
    const sessions = await listFallbackSessions();
    await writeFallbackSessions(sessions.filter((session) => session.expiresAt > now));
    return;
  }

  try {
    await queryPostgres('DELETE FROM auth_sessions WHERE expires_at <= NOW()');
  } catch (error) {
    if (shouldFallbackToFileAuth(error)) {
      const sessions = await listFallbackSessions();
      await writeFallbackSessions(sessions.filter((session) => session.expiresAt > now));
      return;
    }
    throw error;
  }
}

export async function listReportUsers() {
  const users = await listStoredUsers();
  return users.map(toPublicUser);
}

export async function listReportSessions(userId: string, currentToken?: string | null): Promise<AuthSessionView[]> {
  await pruneExpiredSessions();

  if (!getDatabaseUrl()) {
    const sessions = await listFallbackSessions();
    return sessions
      .filter((session) => session.userId === userId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((session) => ({
        ...session,
        current: session.token === currentToken
      }));
  }

  try {
    const result = await queryPostgres<SessionRow>('SELECT * FROM auth_sessions WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return result.rows.map((row) => {
      const session = mapSessionRow(row);
      return {
        ...session,
        current: session.token === currentToken
      };
    });
  } catch (error) {
    if (shouldFallbackToFileAuth(error)) {
      const sessions = await listFallbackSessions();
      return sessions
        .filter((session) => session.userId === userId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map((session) => ({
          ...session,
          current: session.token === currentToken
        }));
    }
    throw error;
  }
}

export async function resolveReportUser(params: { userId?: string | null; name?: string | null }) {
  if (params.userId) {
    const byId = await findStoredUserById(params.userId);
    if (byId) return toPublicUser(byId);
  }

  const normalizedName = params.name?.trim();
  if (normalizedName) {
    const byName = await findStoredUserByName(normalizedName);
    if (byName) return toPublicUser(byName);
  }

  return null;
}

export async function authenticateReportUser(email: string, password: string) {
  const user = await findStoredUserByEmail(email.trim());
  if (!user || user.status !== 'active') return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return toPublicUser(user);
}

export async function createReportSession(userId: string) {
  await pruneExpiredSessions();
  return createStoredSession(userId);
}

export async function getCurrentReportUser(request: NextRequest) {
  await pruneExpiredSessions();
  const token = request.cookies.get(REPORT_AUTH_COOKIE)?.value;
  if (!token) return null;

  const session = await findStoredSessionByToken(token);
  if (!session || session.expiresAt <= new Date().toISOString()) {
    if (session) {
      await deleteStoredSession(session.token);
    }
    return null;
  }

  const user = await findStoredUserById(session.userId);
  return user && user.status === 'active' ? toPublicUser(user) : null;
}

export async function requireReportUser(request: NextRequest) {
  const user = await getCurrentReportUser(request);
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }
  return user;
}

export function canManageReportUsers(user: AuthUser) {
  return user.role === 'admin' || user.role === 'manager';
}

export async function saveReportUser(input: SaveReportUserInput) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const team = input.team.trim();
  const password = input.password?.trim();

  if (!email || !name || !team) {
    throw new Error('Name, email, and team are required.');
  }

  if (!input.id && !password) {
    throw new Error('Password is required for new users.');
  }

  if (!getDatabaseUrl()) {
    const users = await listFallbackUsers();
    const duplicate = users.find((user) => user.email.toLowerCase() === email && user.id !== input.id);
    if (duplicate) {
      throw new Error('A user with that email already exists.');
    }

    const now = new Date().toISOString();
    const existing = input.id ? users.find((user) => user.id === input.id) : null;
    const nextUser: StoredAuthUser = existing
      ? {
          ...existing,
          email,
          name,
          role: input.role,
          team,
          status: input.status,
          mustChangePassword: password ? true : existing.mustChangePassword,
          passwordHash: password ? hashPassword(password) : existing.passwordHash,
          updatedAt: now
        }
      : {
          id: buildUserId(),
          email,
          name,
          role: input.role,
          team,
          status: input.status,
          mustChangePassword: true,
          passwordHash: hashPassword(password ?? 'demo123'),
          createdAt: now,
          updatedAt: now
        };

    const nextUsers = existing
      ? users.map((user) => (user.id === existing.id ? nextUser : user))
      : [nextUser, ...users];
    await writeJson(USERS_FILE, nextUsers);
    return toPublicUser(nextUser);
  }

  try {
    await ensureDatabaseUsersSeeded();
    const existing = input.id ? await findStoredUserById(input.id) : null;
    const duplicate = await queryPostgres<UserRow>('SELECT * FROM auth_users WHERE lower(email) = lower($1) AND id <> COALESCE($2, \'\') LIMIT 1', [email, input.id ?? null]);
    if (duplicate.rows[0]) {
      throw new Error('A user with that email already exists.');
    }

    const now = new Date().toISOString();
    const id = existing?.id ?? buildUserId();
    const createdAt = existing?.createdAt ?? now;
    const passwordHash = password ? hashPassword(password) : existing?.passwordHash ?? hashPassword('demo123');

    await queryPostgres(
      `INSERT INTO auth_users (id, email, name, role, team, status, must_change_password, password_hash, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         team = EXCLUDED.team,
         status = EXCLUDED.status,
         must_change_password = EXCLUDED.must_change_password,
         password_hash = EXCLUDED.password_hash,
         updated_at = EXCLUDED.updated_at`,
      [id, email, name, input.role, team, input.status, password ? true : existing?.mustChangePassword ?? true, passwordHash, createdAt, now]
    );

    const saved = await findStoredUserById(id);
    if (!saved) {
      throw new Error('Failed to save user.');
    }
    return toPublicUser(saved);
  } catch (error) {
    if (shouldFallbackToFileAuth(error)) {
      const currentUsers = await listFallbackUsers();
      const duplicate = currentUsers.find((user) => user.email.toLowerCase() === email && user.id !== input.id);
      if (duplicate) {
        throw new Error('A user with that email already exists.');
      }

      const now = new Date().toISOString();
      const existing = input.id ? currentUsers.find((user) => user.id === input.id) : null;
      const nextUser: StoredAuthUser = existing
        ? {
            ...existing,
            email,
            name,
            role: input.role,
            team,
            status: input.status,
            mustChangePassword: password ? true : existing.mustChangePassword,
            passwordHash: password ? hashPassword(password) : existing.passwordHash,
            updatedAt: now
          }
        : {
            id: buildUserId(),
            email,
            name,
            role: input.role,
            team,
            status: input.status,
            mustChangePassword: true,
            passwordHash: hashPassword(password ?? 'demo123'),
            createdAt: now,
            updatedAt: now
          };

      const nextUsers = existing
        ? currentUsers.map((user) => (user.id === existing.id ? nextUser : user))
        : [nextUser, ...currentUsers];
      await writeJson(USERS_FILE, nextUsers);
      return toPublicUser(nextUser);
    }
    throw error;
  }
}

export async function changeReportUserPassword(userId: string, currentPassword: string, nextPassword: string) {
  const trimmedCurrent = currentPassword.trim();
  const trimmedNext = nextPassword.trim();

  if (!trimmedCurrent || !trimmedNext) {
    throw new Error('Current and new password are required.');
  }

  if (trimmedNext.length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }

  const user = await findStoredUserById(userId);
  if (!user) {
    throw new Error('User not found.');
  }

  if (!verifyPassword(trimmedCurrent, user.passwordHash)) {
    throw new Error('Current password is incorrect.');
  }

  const now = new Date().toISOString();
  const nextHash = hashPassword(trimmedNext);

  if (!getDatabaseUrl()) {
    const users = await listFallbackUsers();
    const nextUsers = users.map((entry) => (entry.id === userId ? { ...entry, passwordHash: nextHash, mustChangePassword: false, updatedAt: now } : entry));
    await writeJson(USERS_FILE, nextUsers);
    return true;
  }

  try {
    await queryPostgres('UPDATE auth_users SET password_hash = $2, must_change_password = FALSE, updated_at = $3 WHERE id = $1', [userId, nextHash, now]);
    return true;
  } catch (error) {
    if (shouldFallbackToFileAuth(error)) {
      const users = await listFallbackUsers();
      const nextUsers = users.map((entry) => (entry.id === userId ? { ...entry, passwordHash: nextHash, mustChangePassword: false, updatedAt: now } : entry));
      await writeJson(USERS_FILE, nextUsers);
      return true;
    }
    throw error;
  }
}

export async function revokeReportSessionById(userId: string, sessionId: string) {
  if (!sessionId) {
    throw new Error('Session ID is required.');
  }

  if (!getDatabaseUrl()) {
    const sessions = await listFallbackSessions();
    await writeFallbackSessions(sessions.filter((session) => !(session.userId === userId && session.id === sessionId)));
    return true;
  }

  try {
    await queryPostgres('DELETE FROM auth_sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]);
    return true;
  } catch (error) {
    if (shouldFallbackToFileAuth(error)) {
      const sessions = await listFallbackSessions();
      await writeFallbackSessions(sessions.filter((session) => !(session.userId === userId && session.id === sessionId)));
      return true;
    }
    throw error;
  }
}

export async function revokeReportSession(request: NextRequest) {
  const token = request.cookies.get(REPORT_AUTH_COOKIE)?.value;
  if (token) {
    await deleteStoredSession(token);
  }
}

export function setReportSessionCookie(response: NextResponse, session: AuthSession) {
  response.cookies.set({
    name: REPORT_AUTH_COOKIE,
    value: session.token,
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    expires: new Date(session.expiresAt)
  });
}

export function clearReportSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: REPORT_AUTH_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    expires: new Date(0)
  });
}
