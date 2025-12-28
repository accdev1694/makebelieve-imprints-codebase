import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/issues/[id]
 * Get issue detail with all messages
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id: issueId } = await params;

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        orderItem: {
          include: {
            order: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                trackingNumber: true,
                shippingAddress: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                size: true,
                color: true,
              },
            },
            design: {
              select: {
                id: true,
                title: true,
                previewUrl: true,
                fileUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        originalIssue: {
          select: {
            id: true,
            reason: true,
            status: true,
            createdAt: true,
          },
        },
        childIssues: {
          select: {
            id: true,
            reason: true,
            status: true,
            createdAt: true,
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

    // Verify ownership
    const order = await prisma.order.findUnique({
      where: { id: issue.orderItem.order.id },
      select: { customerId: true },
    });

    if (order?.customerId !== user.userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Mark admin messages as read
    await prisma.issueMessage.updateMany({
      where: {
        issueId: issueId,
        sender: 'ADMIN',
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return NextResponse.json({ issue });
  } catch (error) {
    console.error('Get issue detail error:', error);
    return handleApiError(error);
  }
}

/**
 * DELETE /api/issues/[id]
 * Customer withdraws an issue (only if SUBMITTED or AWAITING_REVIEW)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id: issueId } = await params;

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        orderItem: {
          include: {
            order: {
              select: { customerId: true },
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

    // Verify ownership
    if (issue.orderItem.order.customerId !== user.userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Can only withdraw if in early stages
    const withdrawableStatuses = ['SUBMITTED', 'AWAITING_REVIEW'];
    if (!withdrawableStatuses.includes(issue.status)) {
      return NextResponse.json(
        { error: 'This issue can no longer be withdrawn as it is already being processed' },
        { status: 400 }
      );
    }

    // Delete the issue (cascade will delete messages)
    await prisma.issue.delete({
      where: { id: issueId },
    });

    return NextResponse.json({
      success: true,
      message: 'Issue has been withdrawn',
    });
  } catch (error) {
    console.error('Withdraw issue error:', error);
    return handleApiError(error);
  }
}
