import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import {
  getIssueMessages,
  sendCustomerMessage,
  markMessagesAsRead,
} from '@/lib/server/issue-service';

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
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    if (issue.orderItem.order.customerId !== user.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const messages = await getIssueMessages(issueId);
    await markMessagesAsRead(issueId, 'ADMIN');

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

    const result = await sendCustomerMessage(issueId, user.userId, content, imageUrls);

    if (!result.success) {
      const status = result.error === 'Issue not found' ? 404
        : result.error === 'Access denied' ? 403
        : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: result.message,
    });
  } catch (error) {
    console.error('Send issue message error:', error);
    return handleApiError(error);
  }
}
