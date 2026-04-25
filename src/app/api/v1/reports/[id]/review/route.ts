import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRoles } from '@/lib/agrireports-middleware';
import { resolveReportUserContact } from '@/lib/report-auth';
import { reportRepository } from '@/lib/repositories/report-repository';
import { canTransition, getTransitionError } from '@/lib/workflow/transitions';
import { ReviewReportRequest } from '@/types/agrireports-api';
import { notifyAuthorOnReview } from '@/lib/notifications/notification-orchestrator';

/**
 * POST /api/v1/reports/:id/review
 * 
 * Review a submitted report (approve, reject, or request changes)
 * Requires authentication - must be admin or reviewer role
 * 
 * Request Body:
 * {
 *   "action": "approve" | "reject" | "changes_requested",
 *   "comments": "Report looks good, all metrics are within range.",
 *   "signature": "data:image/png;base64,iVBORw0KGgo..." // Required for approve
 * }
 */
export const POST = withAuthAndRoles(
  ['admin', 'reviewer', 'manager'],
  async (request: NextRequest, user) => {
    try {
      // Extract ID from URL path
      const urlParts = request.url.split('/');
      const idIndex = urlParts.length - 2;
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

      const body = (await request.json()) as ReviewReportRequest;

      // Validate action
      if (!body.action || !['approve', 'reject', 'changes_requested'].includes(body.action)) {
        return NextResponse.json(
          { 
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Action must be: approve, reject, or changes_requested'
          },
          { status: 400 }
        );
      }

      // Map action to status
      const statusMap: Record<string, 'approved' | 'rejected' | 'changes_requested'> = {
        approve: 'approved',
        reject: 'rejected',
        changes_requested: 'changes_requested'
      };

      const newStatus = statusMap[body.action];

      // Validate state transition
      if (!canTransition(existing.status, newStatus)) {
        return NextResponse.json(
          { 
            success: false,
            error: 'INVALID_TRANSITION',
            message: getTransitionError(existing.status, newStatus)
          },
          { status: 400 }
        );
      }

      // Signature required for approval
      if (body.action === 'approve' && !body.signature) {
        return NextResponse.json(
          { 
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Digital signature is required for approval'
          },
          { status: 400 }
        );
      }

      // Comments required for rejection or changes requested
      if ((body.action === 'reject' || body.action === 'changes_requested') && !body.comments) {
        return NextResponse.json(
          { 
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Comments are required when rejecting or requesting changes'
          },
          { status: 400 }
        );
      }

      // Update report status
      const updated = await reportRepository.updateStatus(
        id,
        newStatus,
        user.sub,
        body.comments,
        body.signature
      );

      if (!updated) {
        return NextResponse.json(
          { 
            success: false,
            error: 'REVIEW_FAILED',
            message: 'Failed to process review'
          },
          { status: 500 }
        );
      }

      // Send notification to author (async, non-blocking)
      try {
        const author =
          (await resolveReportUserContact({
            userId: existing.authorId,
            name: existing.authorName ?? existing.author.name
          })) ?? {
            id: existing.authorId,
            email: existing.author.email || 'author@agrireports.com',
            name: existing.authorName || existing.author.name || 'Author',
            phone: undefined
          };
        
        // Fire-and-forget: don't wait for notifications to complete
        notifyAuthorOnReview(updated, author).catch((err) => {
          console.error('Notification error:', err);
        });
      } catch (notifError) {
        // Non-critical: log but don't fail the request
        console.warn('Failed to send notifications:', notifError);
      }

      // Build response message based on action
      const actionMessages = {
        approve: 'Report approved successfully',
        reject: 'Report rejected',
        changes_requested: 'Changes requested from author'
      };

      return NextResponse.json({
        success: true,
        data: updated,
        message: actionMessages[body.action]
      });
    } catch (error) {
      console.error('Error reviewing report:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Failed to process review'
        },
        { status: 500 }
      );
    }
  }
);
