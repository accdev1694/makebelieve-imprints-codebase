import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { createRefund, resolvePaymentIntentId } from '@/lib/server/stripe-service';
import { createReprintExpense } from '@/lib/server/accounting-service';
import { Prisma, IssueResolutionType } from '@prisma/client';
import {
  auditIssueResolution,
  auditReprintCreation,
  extractAuditContext,
  ActorType,
} from '@/lib/server/audit-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/issues/[id]/process
 * Process an approved issue - create reprint order or issue refund
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(request);
    const { id: issueId } = await params;

    const body = await request.json();
    const { refundType, notes } = body as {
      refundType?: 'FULL_REFUND' | 'PARTIAL_REFUND';
      notes?: string;
    };

    // Get the issue with all related data
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
                payment: true,
                items: {
                  include: {
                    product: true,
                    variant: true,
                    design: true,
                  },
                },
              },
            },
            product: true,
            variant: true,
            design: true,
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

    // Validate status
    if (!['APPROVED_REPRINT', 'APPROVED_REFUND'].includes(issue.status)) {
      return NextResponse.json(
        { error: 'Issue must be approved before processing' },
        { status: 400 }
      );
    }

    const order = issue.orderItem.order;
    const orderItem = issue.orderItem;

    // Handle REPRINT
    if (issue.status === 'APPROVED_REPRINT') {
      const result = await prisma.$transaction(async (tx) => {
        // Create a new order for the reprint (free)
        const reprintOrder = await tx.order.create({
          data: {
            customerId: order.customerId,
            designId: orderItem.designId,
            status: 'confirmed',
            printSize: order.printSize,
            material: order.material,
            orientation: order.orientation,
            printWidth: order.printWidth,
            printHeight: order.printHeight,
            previewUrl: order.previewUrl,
            subtotal: 0,
            totalPrice: 0,
            shippingAddress: order.shippingAddress as Prisma.InputJsonValue,
          },
        });

        // Create the reprint order item
        const reprintItem = await tx.orderItem.create({
          data: {
            orderId: reprintOrder.id,
            productId: orderItem.productId,
            variantId: orderItem.variantId,
            designId: orderItem.designId,
            quantity: orderItem.quantity,
            unitPrice: 0,
            totalPrice: 0,
            customization: orderItem.customization as Prisma.InputJsonValue | undefined,
            metadata: {
              ...(typeof orderItem.metadata === 'object' && orderItem.metadata !== null
                ? (orderItem.metadata as Record<string, unknown>)
                : {}),
              isReprint: true,
              originalOrderId: order.id,
              originalItemId: orderItem.id,
              issueId: issue.id,
            },
          },
        });

        // Update issue and auto-conclude
        const updatedIssue = await tx.issue.update({
          where: { id: issueId },
          data: {
            status: 'COMPLETED',
            resolvedType: 'REPRINT',
            reprintOrderId: reprintOrder.id,
            reprintItemId: reprintItem.id,
            processedAt: new Date(),
            // Auto-conclude on completion
            isConcluded: true,
            concludedAt: new Date(),
            concludedBy: admin.userId,
          },
        });

        // Create completion message
        await tx.issueMessage.create({
          data: {
            issueId: issueId,
            sender: 'ADMIN',
            senderId: admin.userId,
            content: notes || 'Your reprint order has been created and will be processed shortly.',
          },
        });

        return { reprintOrder, reprintItem, issue: updatedIssue };
      });

      // TODO: Send reprint confirmation email

      // Create expense entry to track reprint material costs
      createReprintExpense(
        order.id,
        result.reprintOrder.id,
        issue.reason // Use issue reason (e.g., DAMAGED_IN_TRANSIT, QUALITY_ISSUE)
      ).catch((error) => {
        console.error('Failed to create reprint expense:', error);
      });

      // Audit: Log reprint creation and issue resolution
      const auditContext = extractAuditContext(request.headers, {
        userId: admin.userId,
        email: admin.email,
        type: ActorType.ADMIN,
      });
      auditReprintCreation(
        order.id,
        result.reprintOrder.id,
        auditContext,
        issue.reason
      ).catch((err) => console.error('[Audit] Failed to log reprint creation:', err));

      auditIssueResolution(
        issueId,
        'REPRINT',
        auditContext,
        { reprintOrderId: result.reprintOrder.id }
      ).catch((err) => console.error('[Audit] Failed to log issue resolution:', err));

      return NextResponse.json({
        success: true,
        message: 'Reprint order created successfully',
        reprintOrderId: result.reprintOrder.id,
        issue: result.issue,
      });
    }

    // Handle REFUND
    if (issue.status === 'APPROVED_REFUND') {
      // Check payment exists - if this is a reprint order, look up the original order's payment
      let payment = order.payment;
      let originalOrderId: string | null = null;
      let originalOrderTotal: number | null = null;

      // Check if this is a reprint order (no payment, has metadata indicating it's a reprint)
      if (!payment) {
        // Check orderItem metadata for original order reference
        const itemMetadata = orderItem.metadata as Record<string, unknown> | null;
        if (itemMetadata?.isReprint && itemMetadata?.originalOrderId) {
          originalOrderId = itemMetadata.originalOrderId as string;

          // Look up the original order's payment
          const originalOrder = await prisma.order.findUnique({
            where: { id: originalOrderId },
            include: { payment: true },
          });

          if (originalOrder?.payment) {
            payment = originalOrder.payment;
            originalOrderTotal = Number(originalOrder.totalPrice);
          }
        }
      }

      // Validate payment exists and has required fields
      if (!payment || !payment.stripePaymentId) {
        return NextResponse.json(
          { error: 'No payment found for this order. If this is a reprint order, the original order may not have a valid payment.' },
          { status: 400 }
        );
      }

      // Check payment status is COMPLETED
      if (payment.status !== 'COMPLETED') {
        return NextResponse.json(
          { error: `Payment status is "${payment.status}". Refunds can only be processed for completed payments. The Stripe webhook may not have updated the payment status.` },
          { status: 400 }
        );
      }

      // Resolve the Payment Intent ID - handles both pi_xxx and cs_xxx formats
      // This provides a fallback when the webhook hasn't updated the payment record
      const resolved = await resolvePaymentIntentId(payment.stripePaymentId);

      if (!resolved.paymentIntentId) {
        return NextResponse.json(
          {
            error: `Cannot process refund: ${resolved.error}`,
            suggestion: 'Check Stripe Dashboard to verify the payment status.',
          },
          { status: 400 }
        );
      }

      if (!resolved.isPaid) {
        return NextResponse.json(
          {
            error: 'Cannot process refund: Payment was not completed in Stripe.',
            suggestion: 'Verify the payment status in Stripe Dashboard.',
          },
          { status: 400 }
        );
      }

      // If we resolved from a checkout session, update the local payment record for future use
      if (payment.stripePaymentId.startsWith('cs_')) {
        console.log(`[Issue] Updating payment record with resolved Payment Intent ID: ${resolved.paymentIntentId}`);
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            stripePaymentId: resolved.paymentIntentId,
            status: 'COMPLETED',
            paidAt: payment.paidAt || new Date(),
          },
        });
      }

      if (payment.refundedAt) {
        return NextResponse.json(
          { error: 'This order has already been refunded' },
          { status: 400 }
        );
      }

      // Determine refund amount
      const resolvedRefundType: IssueResolutionType = refundType || 'FULL_REFUND';
      let refundAmount: number;

      if (resolvedRefundType === 'PARTIAL_REFUND') {
        // Partial refund: just this item's price (use original item price if this is a reprint)
        refundAmount = Number(orderItem.totalPrice) || Number(originalOrderTotal) || 0;
      } else {
        // Full refund: entire order (use original order total if this is a reprint)
        refundAmount = originalOrderTotal || Number(order.totalPrice);
      }

      // Validate refund amount
      if (refundAmount <= 0) {
        return NextResponse.json(
          { error: 'Cannot process refund: refund amount is £0. This may be a reprint order - please refund from the original order instead.' },
          { status: 400 }
        );
      }

      // Update issue to processing
      await prisma.issue.update({
        where: { id: issueId },
        data: {
          status: 'PROCESSING',
          resolvedType: resolvedRefundType,
        },
      });

      // Process Stripe refund with idempotency key to prevent duplicates
      const refundResult = await createRefund(
        resolved.paymentIntentId,
        'requested_by_customer',
        refundAmount,
        `issue_${issueId}` // idempotency key
      );

      if ('error' in refundResult || !refundResult.success) {
        // Refund failed - update issue
        await prisma.issue.update({
          where: { id: issueId },
          data: {
            status: 'APPROVED_REFUND', // Back to approved so admin can retry
          },
        });

        await prisma.issueMessage.create({
          data: {
            issueId: issueId,
            sender: 'ADMIN',
            senderId: admin.userId,
            content: `Refund processing failed: ${refundResult.error || 'Unknown error'}. Please try again.`,
          },
        });

        return NextResponse.json(
          { error: refundResult.error || 'Refund processing failed' },
          { status: 400 }
        );
      }

      // Refund succeeded - update everything
      const result = await prisma.$transaction(async (tx) => {
        // Update issue and auto-conclude
        const updatedIssue = await tx.issue.update({
          where: { id: issueId },
          data: {
            status: 'COMPLETED',
            resolvedType: resolvedRefundType,
            refundAmount: refundResult.amount || refundAmount,
            stripeRefundId: refundResult.refundId,
            processedAt: new Date(),
            // Auto-conclude on completion
            isConcluded: true,
            concludedAt: new Date(),
            concludedBy: admin.userId,
          },
        });

        // Update payment
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            refundedAt: new Date(),
            status: resolvedRefundType === 'FULL_REFUND' ? 'REFUNDED' : payment.status,
          },
        });

        // Update order status if full refund
        if (resolvedRefundType === 'FULL_REFUND') {
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'refunded' },
          });
        }

        // Create completion message
        await tx.issueMessage.create({
          data: {
            issueId: issueId,
            sender: 'ADMIN',
            senderId: admin.userId,
            content: notes || `Your refund of £${(refundResult.amount || refundAmount).toFixed(2)} has been processed. It may take 5-10 business days to appear in your account.`,
          },
        });

        return { issue: updatedIssue };
      });

      // TODO: Send refund confirmation email

      // Audit: Log issue resolution
      const auditContext = extractAuditContext(request.headers, {
        userId: admin.userId,
        email: admin.email,
        type: ActorType.ADMIN,
      });
      auditIssueResolution(
        issueId,
        resolvedRefundType,
        auditContext,
        {
          refundAmount: refundResult.amount || refundAmount,
          stripeRefundId: refundResult.refundId,
        }
      ).catch((err) => console.error('[Audit] Failed to log issue resolution:', err));

      return NextResponse.json({
        success: true,
        message: 'Refund processed successfully',
        refundAmount: refundResult.amount || refundAmount,
        issue: result.issue,
      });
    }

    return NextResponse.json(
      { error: 'Invalid issue status for processing' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Process issue error:', error);
    return handleApiError(error);
  }
}
