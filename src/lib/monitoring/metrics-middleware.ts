import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { recordHttpRequest } from './metrics';

/**
 * Metrics Middleware
 * Wraps API route handlers to automatically collect metrics
 * 
 * Usage:
 * import { withMetrics } from './metrics-middleware';
 * 
 * export async function GET(request: NextRequest) {
 *   return withMetrics(request, async () => {
 *     // Your route logic here
 *     return NextResponse.json({ success: true });
 *   });
 * }
 */

export async function withMetrics(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  customRoute?: string
): Promise<NextResponse> {
  const startTime = Date.now();
  const method = request.method;
  const pathname = request.nextUrl.pathname;
  const route = customRoute || pathname;

  try {
    // Execute the handler
    const response = await handler();

    // Calculate duration
    const durationSeconds = (Date.now() - startTime) / 1000;
    const statusCode = response.status;
    const isError = statusCode >= 400;

    // Record metrics
    recordHttpRequest(method, route, statusCode, durationSeconds, isError);

    return response;
  } catch (error) {
    // Calculate duration
    const durationSeconds = (Date.now() - startTime) / 1000;
    const statusCode = 500;

    // Record error metrics
    recordHttpRequest(method, route, statusCode, durationSeconds, true);

    // Re-throw the error
    throw error;
  }
}

/**
 * Extract route pattern from pathname
 * Converts /api/v1/reports/abc-123/submit to /api/v1/reports/:id/submit
 */
export function extractRoutePattern(pathname: string): string {
  const segments = pathname.split('/');
  
  return segments
    .map((segment, _index) => {
      // Skip empty segments
      if (!segment) return segment;
      
      // Skip API version (v1, v2, etc.)
      if (segment.match(/^v\d+$/)) return segment;
      
      // Replace UUIDs with :id
      if (segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return ':id';
      }
      
      // Replace numeric IDs with :id
      if (segment.match(/^\d+$/)) {
        return ':id';
      }
      
      return segment;
    })
    .join('/');
}
