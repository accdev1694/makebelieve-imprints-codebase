import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { createRefund } from '@/lib/server/stripe-service';
import {
  sendCancellationRequestApprovedEmail,
  sendCancellationRequestRejectedEmail,
} from '@/lib/server/email';
import { OrderStatus } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/orders/[id]/cancel-request/review
 * Admin approves or rejects a cancellation request
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(request);
    const { id: orderId } = await params;

    const body = await request.json();
    const { action, notes, processRefund = true } = body as {
      action: 'APPROVE' | 'REJECT';
      notes?: string;
      processRefund?: boolean;
    };

    // Validate action
    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be APPROVE or REJECT.' },
        { status: 400 }
      );
    }

    // Get the order with cancellation request
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        payment: true,
        cancellationRequest: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if there's a cancellation request
    if (!order.cancellationRequest) {
      return NextResponse.json(
        { error: 'No cancellation request found for this order' },
        { status: 400 }
      );
    }

    // Check if the request is still pending
    if (order.cancellationRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Cancellation request has already been ${order.cancellationRequest.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Check if order status is cancellation_requested
    if (order.status !== 'cancellation_requested') {
      return NextResponse.json(
        { error: `Order status is ${order.status}, not cancellation_requested. Cannot process this request.` },
        { status: 400 }
      );
    }

    if (action === 'APPROVE') {
      let refundId: string | null = null;
      let refundAmount: number | null = null;

      // Process refund if payment exists and processRefund is true
      if (processRefund && order.payment && order.payment.status === 'COMPLETED' && order.payment.stripePaymentId) {
        const refundResult = await createRefund(
          order.payment.stripePaymentId,
          'requested_by_customer'
        );

        if (!refundResult.success) {
          return NextResponse.json(
            { error: `Refund failed: ${refundResult.error}. Request not approved.` },
            { status: 400 }
          );
        }

        refundId = refundResult.refundId || null;
        refundAmount = refundResult.amount || null;

        // Update payment status
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: {
            status: 'REFUNDED',
            refundedAt: new Date(),
          },
        });
      }

      // Update cancellation request and order in transaction
      await prisma.$transaction([
        // Update cancellation request
        prisma.cancellationRequest.update({
          where: { id: order.cancellationRequest.id },
          data: {
            status: 'APPROVED',
            reviewedAt: new Date(),
            reviewedBy: admin.userId,
            reviewNotes: notes || null,
          },
        }),
        // Update order
        prisma.order.update({
          where: { id: orderId },
          data: {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledBy: 'CUSTOMER',
            cancellationReason: order.cancellationRequest.reason,
            cancellationNotes: notes || order.cancellationRequest.notes,
            stripeRefundId: refundId,
            refundAmount: refundAmount ? refundAmount : null,
          },
        }),
      ]);

      // Send approval email to customer
      sendCancellationRequestApprovedEmail(
        order.customer.email,
        order.customer.name,
        orderId,
        refundAmount,
        notes || null
      ).catch((error) => {
        console.error('Failed to send cancellation approval email:', error);
      });

      return NextResponse.json({
        success: true,
        message: refundAmount
          ? `Cancellation approved and £${refundAmount.toFixed(2)} refunded`
          : 'Cancellation approved',
        data: {
          orderId,
          status: 'cancelled',
          refundId,
          refundAmount,
        },
      });
    } else {
      // REJECT action
      // Update cancellation request and restore order status
      const parsedStatus = order.cancellationRequest.notes?.includes('previous_status:')
        ? order.cancellationRequest.notes.split('previous_status:')[1]?.trim()
        : null;
      // Validate that the parsed status is a valid OrderStatus, fallback to 'confirmed'
      const validStatuses: OrderStatus[] = ['pending', 'confirmed', 'payment_confirmed', 'printing', 'shipped', 'delivered', 'cancelled', 'refunded', 'cancellation_requested'];
      const previousStatus: OrderStatus = (parsedStatus && validStatuses.includes(parsedStatus as OrderStatus))
        ? (parsedStatus as OrderStatus)
        : 'confirmed';

      await prisma.$transaction([
        // Update cancellation request
        prisma.cancellationRequest.update({
          where: { id: order.cancellationRequest.id },
          data: {
            status: 'REJECTED',
            reviewedAt: new Date(),
            reviewedBy: admin.userId,
            reviewNotes: notes || 'Cancellation request rejected',
          },
        }),
        // Restore order to previous status (confirmed by default)
        prisma.order.update({
          where: { id: orderId },
          data: {
            status: previousStatus || 'confirmed',
          },
        }),
      ]);

      // Send rejection email to customer
      sendCancellationRequestRejectedEmail(
        order.customer.email,
        order.customer.name,
        orderId,
        notes || null
      ).catch((error) => {
        console.error('Failed to send cancellation rejection email:', error);
      });

      return NextResponse.json({
        success: true,
        message: 'Cancellation request rejected',
        data: {
          orderId,
          status: previousStatus || 'confirmed',
        },
      });
    }
  } catch (error) {
    console.error('Review cancellation request error:', error);
    return handleApiError(error);
  }
}
