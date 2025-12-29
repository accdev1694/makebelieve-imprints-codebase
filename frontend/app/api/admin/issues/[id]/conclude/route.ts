import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { sendIssueConcludedEmail } from '@/lib/server/email';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/issues/[id]/conclude
 * Manually conclude an issue (prevents further customer actions)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(request);
    const { id: issueId } = await params;

    const body = await request.json();
    const { reason, notifyCustomer } = body as {
      reason?: string;
      notifyCustomer?: boolean;
    };

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        orderItem: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
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
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    if (issue.isConcluded) {
      return NextResponse.json(
        { error: 'Issue is already concluded' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedIssue = await tx.issue.update({
        where: { id: issueId },
        data: {
          isConcluded: true,
          concludedAt: new Date(),
          concludedBy: admin.userId,
          concludedReason: reason || 'Manually concluded by admin',
        },
      });

      // Create system message
      await tx.issueMessage.create({
        data: {
          issueId,
          sender: 'ADMIN',
          senderId: admin.userId,
          content:
            reason ||
            'This issue has been concluded. No further action is required.',
        },
      });

      return updatedIssue;
    });

    // Send email notification if notifyCustomer is true
    if (notifyCustomer) {
      const customer = issue.orderItem.order.customer;
      const productName = issue.orderItem.product?.name || 'Custom Product';
      const concludedReason = reason || 'This issue has been concluded. No further action is required.';

      try {
        await sendIssueConcludedEmail(
          customer.email,
          customer.name || 'Valued Customer',
          issueId,
          productName,
          concludedReason,
          issue.status
        );
      } catch (emailError) {
        console.error('Failed to send issue concluded email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Issue concluded successfully',
      issue: result,
    });
  } catch (error) {
    console.error('Conclude issue error:', error);
    return handleApiError(error);
  }
}

/**
 * DELETE /api/admin/issues/[id]/conclude
 * Reopen a concluded issue
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(request);
    const { id: issueId } = await params;

    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    if (!issue.isConcluded) {
      return NextResponse.json(
        { error: 'Issue is not concluded' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedIssue = await tx.issue.update({
        where: { id: issueId },
        data: {
          isConcluded: false,
          concludedAt: null,
          concludedBy: null,
          concludedReason: null,
        },
      });

      await tx.issueMessage.create({
        data: {
          issueId,
          sender: 'ADMIN',
          senderId: admin.userId,
          content: 'This issue has been reopened for further review.',
        },
      });

      return updatedIssue;
    });

    return NextResponse.json({
      success: true,
      message: 'Issue reopened successfully',
      issue: result,
    });
  } catch (error) {
    console.error('Reopen issue error:', error);
    return handleApiError(error);
  }
}
