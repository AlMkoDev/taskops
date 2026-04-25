import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/agrireports-middleware';
import { resolveReportUser } from '@/lib/report-auth';
import { reportRepository } from '@/lib/repositories/report-repository';
import { CreateReportRequest } from '@/types/agrireports-api';
import { Report, ReportAuthor } from '@/types/agrireports';

/**
 * POST /api/v1/reports
 * 
 * Create a new report
 * Requires authentication
 * 
 * Request Body:
 * {
 *   "period": "daily",
 *   "role": "field_ops_manager",
 *   "roleName": "Field Operations Manager",
 *   "reportingWindow": "2026-04-21",
 *   "data": { ... }
 * }
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const body = (await request.json()) as CreateReportRequest;

    // Validate required fields
    if (!body.period || !body.role) {
      return NextResponse.json(
        { 
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Period and role are required',
          details: {
            period: body.period ? undefined : ['Period is required'],
            role: body.role ? undefined : ['Role is required']
          }
        },
        { status: 400 }
      );
    }

    // Validate period value
    const validPeriods = ['daily', 'weekly', 'monthly', 'quarterly', 'closeout'];
    if (!validPeriods.includes(body.period)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'VALIDATION_ERROR',
          message: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Build author object from JWT payload
    const author: ReportAuthor = {
      id: user.sub,
      name: user.name,
      email: user.email,
    };

    const reviewer =
      (await resolveReportUser({
        userId: body.reviewerId,
        name: body.reviewerName
      })) ?? null;

    // Create report record
    const newReport: Omit<Report, 'id' | 'createdAt' | 'updatedAt'> = {
      period: body.period,
      role: body.role,
      title: body.title,
      roleName: body.roleName,
      category: body.category,
      status: 'draft',
      authorId: user.sub,
      author,
      authorName: user.name,
      reviewerId: reviewer?.id,
      reviewerName: reviewer?.name ?? body.reviewerName,
      reviewedBy: reviewer
        ? {
            id: reviewer.id,
            name: reviewer.name,
            email: reviewer.email
          }
        : undefined,
      data: body.data || {},
      reportingWindow: body.reportingWindow,
    };

    const created = await reportRepository.create(newReport);

    return NextResponse.json(
      {
        success: true,
        data: created,
        message: 'Report created successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to create report'
      },
      { status: 500 }
    );
  }
});
