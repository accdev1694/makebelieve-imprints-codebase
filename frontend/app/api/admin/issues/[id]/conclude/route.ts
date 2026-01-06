import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { concludeIssue, reopenIssue } from '@/lib/server/issue-service';
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

    const result = await concludeIssue(issueId, admin.userId, reason);

    if (!result.success) {
      const status = result.error === 'Issue not found' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    // Send email notification if notifyCustomer is true
    if (notifyCustomer) {
      const issue = await prisma.issue.findUnique({
        where: { id: issueId },
        include: {
          orderItem: {
            include: {
              product: { select: { name: true } },
              order: {
                include: {
                  customer: { select: { name: true, email: true } },
                },
              },
            },
          },
        },
      });

      if (issue) {
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
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Issue concluded successfully',
      issue: result.issue,
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

    const result = await reopenIssue(issueId, admin.userId);

    if (!result.success) {
      const status = result.error === 'Issue not found' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      success: true,
      message: 'Issue reopened successfully',
      issue: result.issue,
    });
  } catch (error) {
    console.error('Reopen issue error:', error);
    return handleApiError(error);
  }
}
