// AgriReports Platform - API Authentication Middleware
// Protects API routes with JWT authentication

import { NextRequest, NextResponse } from 'next/server';
import { verifyJwtToken, AgriReportsJwtPayload } from '@/lib/agrireports-auth';
import { AuthUser } from '@/types/domain';

export interface AuthenticatedRequest extends NextRequest {
  user: AgriReportsJwtPayload;
}

/**
 * Middleware to authenticate API requests with JWT Bearer token
 * Usage: Wrap your route handler with this middleware
 */
export async function authenticateApiRequest(
  request: NextRequest
): Promise<AgriReportsJwtPayload | null> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return null;
    }

    const [scheme, token] = authHeader.split(' ');
    
    if (scheme !== 'Bearer' || !token) {
      return null;
    }

    const payload = await verifyJwtToken(token);
    return payload;
  } catch (_error) {
    // Token verification failed
    return null;
  }
}

/**
 * Helper to create unauthorized response
 */
export function unauthorizedResponse(message: string = 'Authentication required') {
  return NextResponse.json(
    { 
      success: false,
      error: 'UNAUTHORIZED',
      message 
    },
    { status: 401 }
  );
}

/**
 * Helper to create forbidden response
 */
export function forbiddenResponse(message: string = 'Insufficient permissions') {
  return NextResponse.json(
    { 
      success: false,
      error: 'FORBIDDEN',
      message 
    },
    { status: 403 }
  );
}

/**
 * Require authentication - returns 401 if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<AgriReportsJwtPayload> {
  const user = await authenticateApiRequest(request);
  
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  
  return user;
}

/**
 * Check if user has required role
 */
export function requireRole(user: AgriReportsJwtPayload, allowedRoles: AuthUser['role'][]): boolean {
  return allowedRoles.includes(user.role);
}

/**
 * Middleware wrapper for GET requests
 */
export function withAuth<T>(
  handler: (request: NextRequest, user: AgriReportsJwtPayload) => Promise<T>
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      const user = await requireAuth(request);
      return await handler(request, user) as Response;
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      return NextResponse.json(
        { 
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware wrapper with role-based authorization
 */
export function withAuthAndRoles<T>(
  allowedRoles: AuthUser['role'][],
  handler: (request: NextRequest, user: AgriReportsJwtPayload) => Promise<T>
) {
  return async (request: NextRequest): Promise<Response> => {
    try {
      const user = await requireAuth(request);
      
      if (!requireRole(user, allowedRoles)) {
        return forbiddenResponse(`Requires one of roles: ${allowedRoles.join(', ')}`);
      }
      
      return await handler(request, user) as Response;
    } catch (error) {
      if (error instanceof Error && error.message === 'UNAUTHORIZED') {
        return unauthorizedResponse();
      }
      return NextResponse.json(
        { 
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred'
        },
        { status: 500 }
      );
    }
  };
}
