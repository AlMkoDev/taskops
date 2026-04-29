// AgriReports Platform - JWT Authentication Utilities
// Token generation and verification for API authentication

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { AuthUser } from '../types/domain';

const JWT_SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'taskops-dev-secret-key-change-in-production'
);

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface AgriReportsJwtPayload extends JWTPayload {
  sub: string;        // userId
  email: string;
  name: string;
  role: AuthUser['role'];
  team: string;
}

/**
 * Sign a JWT token for an authenticated user
 */
export async function signJwtToken(user: AuthUser): Promise<string> {
  const payload: AgriReportsJwtPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    team: user.team,
    iat: Math.floor(Date.now() / 1000),
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET_KEY);

  return token;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyJwtToken(token: string): Promise<AgriReportsJwtPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY);
    return payload as AgriReportsJwtPayload;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid token: ${error.message}`);
    }
    throw new Error('Invalid token');
  }
}

/**
 * Decode JWT without verification (for client-side use only)
 */
export function decodeJwtToken(token: string): AgriReportsJwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}
