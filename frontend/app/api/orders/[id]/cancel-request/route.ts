import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import {
  sendCancellationRequestReceivedEmail,
  sendAdminCancellationRequestAlert
} from '@/lib/server/email';
import { CancellationReason, OrderStatus } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Customer-allowed cancellation reasons
const CUSTOMER_CANCELLATION_REASONS: CancellationReason[] = [
  'BUYER_REQUEST',
  'DUPLICATE_ORDER',
  'OTHER',
];

// Order statuses that customers can request cancellation for
const REQUESTABLE_STATUSES: OrderStatus[] = [
  'pending',
  'payment_confirmed',
  'confirmed',
];

// Admin email for notifications
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@makebelieveimprints.co.uk';

/**
 * POST /api/orders/[id]/cancel-request
 * Customer requests order cancellation
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id: orderId } = await params;

    const body = await request.json();
    const { reason, notes } = body as {
      reason: CancellationReason;
      notes?: string;
    };

    // Validate reason
    if (!reason || !CUSTOMER_CANCELLATION_REASONS.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid cancellation reason. Please select a valid reason.' },
        { status: 400 }
      );
    }

    // Get the order
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

    // Check if user owns this order
    if (order.customerId !== user.userId) {
      return NextResponse.json(
        { error: 'You do not have permission to cancel this order' },
        { status: 403 }
      );
    }

    // Check if order can have cancellation requested
    if (!REQUESTABLE_STATUSES.includes(order.status)) {
      if (order.status === 'printing') {
        return NextResponse.json(
          { error: 'Your order has already started production and cannot be cancelled. Please contact us if you have concerns.' },
          { status: 400 }
        );
      }
      if (order.status === 'shipped' || order.status === 'delivered') {
        return NextResponse.json(
          { error: 'Your order has already been shipped. Please use the returns process if needed.' },
          { status: 400 }
        );
      }
      if (order.status === 'cancelled' || order.status === 'refunded') {
        return NextResponse.json(
          { error: 'This order has already been cancelled or refunded.' },
          { status: 400 }
        );
      }
      if (order.status === 'cancellation_requested') {
        return NextResponse.json(
          { error: 'A cancellation request is already pending for this order.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `Cannot request cancellation for order with status: ${order.status}` },
        { status: 400 }
      );
    }

    // Check if there's already a pending cancellation request
    if (order.cancellationRequest && order.cancellationRequest.status === 'PENDING') {
      return NextResponse.json(
        { error: 'A cancellation request is already pending for this order.' },
        { status: 400 }
      );
    }

    // Create cancellation request and update order status in transaction
    const [cancellationRequest] = await prisma.$transaction([
      // Create the cancellation request
      prisma.cancellationRequest.create({
        data: {
          orderId,
          reason,
          notes: notes || null,
          status: 'PENDING',
        },
      }),
      // Update order status to cancellation_requested
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'cancellation_requested',
        },
      }),
    ]);

    // Send confirmation email to customer
    sendCancellationRequestReceivedEmail(
      order.customer.email,
      order.customer.name,
      orderId,
      reason
    ).catch((error) => {
      console.error('Failed to send cancellation request confirmation email:', error);
    });

    // Send alert to admin
    sendAdminCancellationRequestAlert(
      ADMIN_EMAIL,
      orderId,
      order.customer.name,
      order.customer.email,
      reason,
      notes || null,
      Number(order.totalPrice)
    ).catch((error) => {
      console.error('Failed to send admin cancellation alert:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Cancellation request submitted successfully. We will review your request and get back to you within 24 hours.',
      data: {
        requestId: cancellationRequest.id,
        orderId,
        status: 'PENDING',
        createdAt: cancellationRequest.createdAt,
      },
    });
  } catch (error) {
    console.error('Create cancellation request error:', error);
    return handleApiError(error);
  }
}

/**
 * GET /api/orders/[id]/cancel-request
 * Get cancellation request status for an order
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id: orderId } = await params;

    // Get the order with cancellation request
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        cancellationRequest: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user owns this order or is admin
    if (order.customerId !== user.userId && user.type !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to view this order' },
        { status: 403 }
      );
    }

    if (!order.cancellationRequest) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: order.cancellationRequest.id,
        orderId,
        reason: order.cancellationRequest.reason,
        notes: order.cancellationRequest.notes,
        status: order.cancellationRequest.status,
        createdAt: order.cancellationRequest.createdAt,
        reviewedAt: order.cancellationRequest.reviewedAt,
        reviewNotes: order.cancellationRequest.reviewNotes,
      },
    });
  } catch (error) {
    console.error('Get cancellation request error:', error);
    return handleApiError(error);
  }
}
