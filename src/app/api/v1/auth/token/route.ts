import { NextRequest, NextResponse } from 'next/server';
import { authenticateReportUser } from '../../../../../lib/report-auth';
import { signJwtToken } from '../../../../../lib/agrireports-auth';

/**
 * POST /api/v1/auth/token
 * 
 * Authenticate user and return JWT token for API access
 * 
 * Request Body:
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "token": "eyJhbGciOiJIUzI1NiIs...",
 *     "expiresIn": "7d",
 *     "user": { ... }
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    
    if (!body.email || !body.password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Email and password are required'
        },
        { status: 400 }
      );
    }

    // Authenticate user against existing auth system
    const user = await authenticateReportUser(body.email, body.password);
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'AUTH_FAILED',
          message: 'Invalid email or password'
        },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = await signJwtToken(user);

    return NextResponse.json({
      success: true,
      data: {
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          team: user.team
        }
      }
    });
  } catch (error) {
    console.error('Token endpoint error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Authentication failed'
      },
      { status: 500 }
    );
  }
}
