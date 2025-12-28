import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/issues/[id]/messages
 * Get all messages for an issue (admin view)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: issueId } = await params;

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    const messages = await prisma.issueMessage.findMany({
      where: { issueId },
      orderBy: { createdAt: 'asc' },
    });

    // Mark customer messages as read
    await prisma.issueMessage.updateMany({
      where: {
        issueId,
        sender: 'CUSTOMER',
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Get admin issue messages error:', error);
    return handleApiError(error);
  }
}

/**
 * POST /api/admin/issues/[id]/messages
 * Admin sends a message on an issue
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(request);
    const { id: issueId } = await params;

    const body = await request.json();
    const { content, imageUrls } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Get issue
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        orderItem: {
          include: {
            order: {
              include: {
                customer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
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
        sender: 'ADMIN',
        senderId: admin.userId,
        content: content.trim(),
        imageUrls: validatedImageUrls.length > 0 ? validatedImageUrls : undefined,
      },
    });

    // TODO: Send email notification to customer

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    console.error('Send admin issue message error:', error);
    return handleApiError(error);
  }
}
