import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/agrireports-middleware';
import { reportRepository } from '@/lib/repositories/report-repository';
import { UpdateReportRequest } from '@/types/agrireports-api';
import { Report } from '@/types/agrireports';

/**
 * GET /api/v1/reports/:id
 * 
 * Get a single report by ID
 * Requires authentication
 */
export const GET = withAuth(async (request: NextRequest, _user) => {
  try {
    // Extract ID from URL path
    const urlParts = request.url.split('/');
    const id = urlParts[urlParts.length - 1];

    if (!id || id.startsWith('?')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Report ID is required'
        },
        { status: 400 }
      );
    }

    const report = await reportRepository.findById(id);

    if (!report) {
      return NextResponse.json(
        { 
          success: false,
          error: 'NOT_FOUND',
          message: 'Report not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch report'
      },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/v1/reports/:id
 * 
 * Update an existing report (draft or changes_requested only)
 * Requires authentication - must be author or admin
 */
export const PUT = withAuth(async (request: NextRequest, user) => {
  try {
    const urlParts = request.url.split('/');
    const id = urlParts[urlParts.length - 1].split('?')[0];

    if (!id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Report ID is required'
        },
        { status: 400 }
      );
    }

    const existing = await reportRepository.findById(id);

    if (!existing) {
      return NextResponse.json(
        { 
          success: false,
          error: 'NOT_FOUND',
          message: 'Report not found'
        },
        { status: 404 }
      );
    }

    // Only allow author or admin to update
    if (existing.authorId !== user.sub && user.role !== 'admin') {
      return NextResponse.json(
        { 
          success: false,
          error: 'FORBIDDEN',
          message: 'Only the author or admin can update this report'
        },
        { status: 403 }
      );
    }

    // Can only update draft or changes_requested reports
    if (existing.status !== 'draft' && existing.status !== 'changes_requested') {
      return NextResponse.json(
        { 
          success: false,
          error: 'INVALID_STATE',
          message: `Cannot update report in "${existing.status}" state`
        },
        { status: 400 }
      );
    }

    const body = (await request.json()) as UpdateReportRequest;
    const updates: Partial<Report> = {};

    if (body.data !== undefined) updates.data = body.data;
    if (body.signature !== undefined) updates.signature = body.signature;
    if (body.reportingWindow !== undefined) updates.reportingWindow = body.reportingWindow;

    const updated = await reportRepository.update(id, updates);

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Report updated successfully'
    });
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to update report'
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/v1/reports/:id
 * 
 * Delete a report (draft only)
 * Requires authentication - must be author or admin
 */
export const DELETE = withAuth(async (request: NextRequest, user) => {
  try {
    const urlParts = request.url.split('/');
    const id = urlParts[urlParts.length - 1].split('?')[0];

    if (!id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Report ID is required'
        },
        { status: 400 }
      );
    }

    const existing = await reportRepository.findById(id);

    if (!existing) {
      return NextResponse.json(
        { 
          success: false,
          error: 'NOT_FOUND',
          message: 'Report not found'
        },
        { status: 404 }
      );
    }

    // Only allow author or admin to delete
    if (existing.authorId !== user.sub && user.role !== 'admin') {
      return NextResponse.json(
        { 
          success: false,
          error: 'FORBIDDEN',
          message: 'Only the author or admin can delete this report'
        },
        { status: 403 }
      );
    }

    // Can only delete draft reports
    if (existing.status !== 'draft') {
      return NextResponse.json(
        { 
          success: false,
          error: 'INVALID_STATE',
          message: 'Only draft reports can be deleted'
        },
        { status: 400 }
      );
    }

    const deleted = await reportRepository.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { 
          success: false,
          error: 'DELETE_FAILED',
          message: 'Failed to delete report'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to delete report'
      },
      { status: 500 }
    );
  }
});
