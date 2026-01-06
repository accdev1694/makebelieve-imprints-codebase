import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import {
  getIssueMessages,
  sendAdminMessage,
  markMessagesAsRead,
  markMessageEmailSent,
} from '@/lib/server/issue-service';
import { sendIssueMessageEmail } from '@/lib/server/email';

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
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const messages = await getIssueMessages(issueId);
    await markMessagesAsRead(issueId, 'CUSTOMER');

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

    const result = await sendAdminMessage(issueId, admin.userId, content, imageUrls);

    if (!result.success) {
      const status = result.error === 'Issue not found' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    // Get customer info for email
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        orderItem: {
          include: {
            order: {
              include: {
                customer: { select: { name: true, email: true } },
              },
            },
          },
        },
      },
    });

    // Send email notification to customer
    if (issue) {
      const customer = issue.orderItem.order.customer;
      try {
        const emailSent = await sendIssueMessageEmail(
          customer.email,
          customer.name,
          issueId,
          'admin',
          content.trim()
        );

        if (emailSent && result.message && typeof result.message === 'object' && 'id' in result.message) {
          await markMessageEmailSent(result.message.id as string);
        }
      } catch (emailErr) {
        console.error('Failed to send issue message email:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: result.message,
    });
  } catch (error) {
    console.error('Send admin issue message error:', error);
    return handleApiError(error);
  }
}
