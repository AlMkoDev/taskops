import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/agrireports-middleware';
import { reportRepository } from '@/lib/repositories/report-repository';
import { ReportStatus, ReportFrequency } from '@/types/agrireports';

/**
 * GET /api/v1/reports
 * 
 * Protected endpoint - requires valid JWT token
 * Returns paginated list of reports
 * 
 * Headers:
 *   Authorization: Bearer <token>
 * 
 * Query Parameters:
 *   status?: draft | submitted | approved | rejected | changes_requested
 *   frequency?: daily | weekly | monthly | quarterly | closeout
 *   page?: number (default: 1)
 *   pageSize?: number (default: 20)
 */
export const GET = withAuth(async (request: NextRequest, _user) => {
  try {
    const { searchParams } = new URL(request.url);
    
    const query = {
      status: searchParams.get('status') as ReportStatus | undefined,
      frequency: searchParams.get('frequency') as ReportFrequency | undefined,
      authorId: searchParams.get('authorId') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      search: searchParams.get('search') || undefined,
    };

    const { reports, total } = await reportRepository.findAll(query);

    return NextResponse.json({
      success: true,
      data: {
        reports,
        pagination: {
          total,
          page: query.page,
          pageSize: query.pageSize,
          hasMore: query.page * query.pageSize < total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch reports'
      },
      { status: 500 }
    );
  }
});
