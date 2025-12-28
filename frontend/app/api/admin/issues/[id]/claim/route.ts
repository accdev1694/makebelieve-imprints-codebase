import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { ClaimStatus } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_CLAIM_STATUSES: ClaimStatus[] = [
  'NOT_FILED',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'PAID',
];

/**
 * GET /api/admin/issues/[id]/claim
 * Get claim status for an issue
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: issueId } = await params;

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: {
        id: true,
        carrierFault: true,
        claimReference: true,
        claimStatus: true,
        claimSubmittedAt: true,
        claimPayoutAmount: true,
        claimPaidAt: true,
        claimNotes: true,
        orderItem: {
          select: {
            totalPrice: true,
            order: {
              select: {
                trackingNumber: true,
                carrier: true,
              },
            },
          },
        },
      },
    });

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      claim: {
        issueId: issue.id,
        carrierFault: issue.carrierFault,
        trackingNumber: issue.orderItem.order.trackingNumber,
        carrier: issue.orderItem.order.carrier,
        itemValue: Number(issue.orderItem.totalPrice),
        claimReference: issue.claimReference,
        claimStatus: issue.claimStatus,
        claimSubmittedAt: issue.claimSubmittedAt,
        claimPayoutAmount: issue.claimPayoutAmount ? Number(issue.claimPayoutAmount) : null,
        claimPaidAt: issue.claimPaidAt,
        claimNotes: issue.claimNotes,
      },
    });
  } catch (error) {
    console.error('Get claim status error:', error);
    return handleApiError(error);
  }
}

/**
 * PUT /api/admin/issues/[id]/claim
 * Update claim status for an issue
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: issueId } = await params;

    const body = await request.json();
    const {
      claimReference,
      claimStatus,
      claimPayoutAmount,
      claimNotes,
    } = body as {
      claimReference?: string;
      claimStatus?: ClaimStatus;
      claimPayoutAmount?: number;
      claimNotes?: string;
    };

    // Validate claim status
    if (claimStatus && !VALID_CLAIM_STATUSES.includes(claimStatus)) {
      return NextResponse.json(
        { error: 'Invalid claim status' },
        { status: 400 }
      );
    }

    // Get the issue
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: {
        id: true,
        carrierFault: true,
        claimStatus: true,
        claimSubmittedAt: true,
      },
    });

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    // Warn if not carrier fault
    if (issue.carrierFault !== 'CARRIER_FAULT') {
      return NextResponse.json(
        { error: 'This issue is not marked as carrier fault. Update carrier fault status first.' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (claimReference !== undefined) {
      updateData.claimReference = claimReference || null;
    }

    if (claimStatus !== undefined) {
      updateData.claimStatus = claimStatus;

      // Auto-set timestamps based on status changes
      if (claimStatus === 'SUBMITTED' && !issue.claimSubmittedAt) {
        updateData.claimSubmittedAt = new Date();
      }

      if (claimStatus === 'PAID') {
        updateData.claimPaidAt = new Date();
      }
    }

    if (claimPayoutAmount !== undefined) {
      updateData.claimPayoutAmount = claimPayoutAmount > 0 ? claimPayoutAmount : null;
    }

    if (claimNotes !== undefined) {
      updateData.claimNotes = claimNotes || null;
    }

    // Update the issue
    const updatedIssue = await prisma.issue.update({
      where: { id: issueId },
      data: updateData,
      select: {
        id: true,
        claimReference: true,
        claimStatus: true,
        claimSubmittedAt: true,
        claimPayoutAmount: true,
        claimPaidAt: true,
        claimNotes: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Claim status updated',
      claim: {
        issueId: updatedIssue.id,
        claimReference: updatedIssue.claimReference,
        claimStatus: updatedIssue.claimStatus,
        claimSubmittedAt: updatedIssue.claimSubmittedAt,
        claimPayoutAmount: updatedIssue.claimPayoutAmount ? Number(updatedIssue.claimPayoutAmount) : null,
        claimPaidAt: updatedIssue.claimPaidAt,
        claimNotes: updatedIssue.claimNotes,
      },
    });
  } catch (error) {
    console.error('Update claim status error:', error);
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/issues/[id]/claim
 * Mark claim as submitted (quick action)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: issueId } = await params;

    const body = await request.json();
    const { claimReference } = body as { claimReference?: string };

    // Get the issue
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      select: {
        id: true,
        carrierFault: true,
        claimStatus: true,
      },
    });

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    if (issue.carrierFault !== 'CARRIER_FAULT') {
      return NextResponse.json(
        { error: 'This issue is not marked as carrier fault' },
        { status: 400 }
      );
    }

    if (issue.claimStatus !== 'NOT_FILED') {
      return NextResponse.json(
        { error: 'Claim has already been filed' },
        { status: 400 }
      );
    }

    // Mark as submitted
    const updatedIssue = await prisma.issue.update({
      where: { id: issueId },
      data: {
        claimStatus: 'SUBMITTED',
        claimSubmittedAt: new Date(),
        claimReference: claimReference || null,
      },
      select: {
        id: true,
        claimReference: true,
        claimStatus: true,
        claimSubmittedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Claim marked as submitted',
      claim: updatedIssue,
    });
  } catch (error) {
    console.error('Submit claim error:', error);
    return handleApiError(error);
  }
}
