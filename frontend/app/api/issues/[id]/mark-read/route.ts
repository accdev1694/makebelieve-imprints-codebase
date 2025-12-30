import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/issues/[id]/mark-read
 * Mark all messages from the other party as read
 * - For customers: marks ADMIN messages as read
 * - For admins: marks CUSTOMER messages as read
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id: issueId } = await params;

    // Find the issue and verify access
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        orderItem: {
          include: {
            order: {
              select: {
                customerId: true,
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

    // Determine which messages to mark as read based on user role
    const isAdmin = user.type === 'admin';
    const isOwner = issue.orderItem.order.customerId === user.userId;

    // Verify the user has access to this issue
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'Not authorized to access this issue' },
        { status: 403 }
      );
    }

    // Mark messages from the other party as read
    const senderToMark = isAdmin ? 'CUSTOMER' : 'ADMIN';

    const result = await prisma.issueMessage.updateMany({
      where: {
        issueId,
        sender: senderToMark,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      markedCount: result.count,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
