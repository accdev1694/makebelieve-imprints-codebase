import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/issues/[id]/messages
 * Get all messages for an issue
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id: issueId } = await params;

    // Verify ownership
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

    if (issue.orderItem.order.customerId !== user.userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const messages = await prisma.issueMessage.findMany({
      where: { issueId },
      orderBy: { createdAt: 'asc' },
    });

    // Mark admin messages as read
    await prisma.issueMessage.updateMany({
      where: {
        issueId,
        sender: 'ADMIN',
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Get issue messages error:', error);
    return handleApiError(error);
  }
}

/**
 * POST /api/issues/[id]/messages
 * Customer sends a message on an issue
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id: issueId } = await params;

    const body = await request.json();
    const { content, imageUrls } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Verify ownership and get issue
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

    if (issue.orderItem.order.customerId !== user.userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if issue is still open for messages
    const closedStatuses = ['COMPLETED', 'CLOSED'];
    if (closedStatuses.includes(issue.status)) {
      return NextResponse.json(
        { error: 'This issue has been closed and no longer accepts messages' },
        { status: 400 }
      );
    }

    // Validate imageUrls
    const validatedImageUrls = Array.isArray(imageUrls)
      ? imageUrls.filter((url: unknown) => typeof url === 'string' && url.length > 0)
      : [];

    // Create the message
    const message = await prisma.issueMessage.create({
      data: {
        issueId,
        sender: 'CUSTOMER',
        senderId: user.userId,
        content: content.trim(),
        imageUrls: validatedImageUrls.length > 0 ? validatedImageUrls : undefined,
      },
    });

    // If issue was in INFO_REQUESTED, move back to AWAITING_REVIEW
    if (issue.status === 'INFO_REQUESTED') {
      await prisma.issue.update({
        where: { id: issueId },
        data: { status: 'AWAITING_REVIEW' },
      });
    }

    // TODO: Send email notification to admin

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    console.error('Send issue message error:', error);
    return handleApiError(error);
  }
}
