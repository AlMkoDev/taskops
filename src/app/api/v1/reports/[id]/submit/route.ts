import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../../lib/agrireports-middleware';
import { resolveReportUserContact } from '../../../../../../lib/report-auth';
import { reportRepository } from '../../../../../../lib/repositories/report-repository';
import { canTransition, getTransitionError } from '../../../../../../lib/workflow/transitions';
import { SubmitReportRequest } from '../../../../../../types/agrireports-api';
import { notifyReviewersOnSubmit } from '../../../../../../lib/notifications/notification-orchestrator';

/**
 * POST /api/v1/reports/:id/submit
 * 
 * Submit a draft report for review
 * Requires authentication - must be the author
 * 
 * Request Body:
 * {
 *   "signature": "data:image/png;base64,iVBORw0KGgo..."
 * }
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    // Extract ID from URL path
    const urlParts = request.url.split('/');
    const idIndex = urlParts.length - 2; // Second to last segment is the ID
    const id = urlParts[idIndex];

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

    // Only author can submit
    if (existing.authorId !== user.sub) {
      return NextResponse.json(
        { 
          success: false,
          error: 'FORBIDDEN',
          message: 'Only the author can submit this report'
        },
        { status: 403 }
      );
    }

    // Validate state transition
    if (!canTransition(existing.status, 'submitted')) {
      return NextResponse.json(
        { 
          success: false,
          error: 'INVALID_TRANSITION',
          message: getTransitionError(existing.status, 'submitted')
        },
        { status: 400 }
      );
    }

    const body = (await request.json()) as SubmitReportRequest;

    // Signature is required for submission
    if (!body.signature) {
      return NextResponse.json(
        { 
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Digital signature is required for submission'
        },
        { status: 400 }
      );
    }

    // Update status to submitted with signature
    const updated = await reportRepository.updateStatus(
      id,
      'submitted',
      undefined,
      undefined,
      body.signature
    );

    if (!updated) {
      return NextResponse.json(
        { 
          success: false,
          error: 'SUBMIT_FAILED',
          message: 'Failed to submit report'
        },
        { status: 500 }
      );
    }

    // Send notifications to reviewers (async, non-blocking)
    try {
      const reviewerContact =
        (await resolveReportUserContact({
          userId: updated.reviewerId,
          name: updated.reviewerName
        })) ??
        (updated.reviewerName
          ? {
              id: updated.reviewerId ?? 'unknown',
              email: updated.reviewedBy?.email || 'reviewer@agrireports.com',
              name: updated.reviewerName,
              phone: undefined
            }
          : null);
      
      if (reviewerContact) {
        // Fire-and-forget: don't wait for notifications to complete
        notifyReviewersOnSubmit(updated, [reviewerContact]).catch((err) => {
          console.error('Notification error:', err);
        });
      }
    } catch (notifError) {
      // Non-critical: log but don't fail the request
      console.warn('Failed to send notifications:', notifError);
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Report submitted for review successfully'
    });
  } catch (error) {
    console.error('Error submitting report:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to submit report'
      },
      { status: 500 }
    );
  }
});
