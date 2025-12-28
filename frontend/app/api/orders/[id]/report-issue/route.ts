import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/orders/[id]/report-issue
 * Customer reports an issue with their order
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id: orderId } = await params;

    const body = await request.json();
    const { reason, notes, imageUrls } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Please select a reason for your issue' },
        { status: 400 }
      );
    }

    // Validate reason
    const validReasons = [
      'DAMAGED_IN_TRANSIT',
      'QUALITY_ISSUE',
      'WRONG_ITEM',
      'PRINTING_ERROR',
      'OTHER',
    ];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid reason selected' },
        { status: 400 }
      );
    }

    // Get the order and verify ownership
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify the customer owns this order
    if (order.customerId !== user.userId) {
      return NextResponse.json(
        { error: 'You can only report issues for your own orders' },
        { status: 403 }
      );
    }

    // Check order status - can only report issues for delivered/shipped orders
    if (!['shipped', 'delivered'].includes(order.status)) {
      return NextResponse.json(
        { error: 'You can only report issues for orders that have been shipped or delivered' },
        { status: 400 }
      );
    }

    // Check if there's already a pending issue for this order
    const existingIssue = await prisma.resolution.findFirst({
      where: {
        orderId: orderId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (existingIssue) {
      return NextResponse.json(
        { error: 'There is already a pending issue report for this order. Our team is reviewing it.' },
        { status: 400 }
      );
    }

    // Validate imageUrls if provided
    const validatedImageUrls = Array.isArray(imageUrls)
      ? imageUrls.filter((url: unknown) => typeof url === 'string' && url.length > 0)
      : [];

    // Create the issue report as a PENDING resolution
    const resolution = await prisma.resolution.create({
      data: {
        orderId: orderId,
        type: 'REPRINT', // Default to reprint, admin can change to refund if needed
        reason: reason,
        notes: notes || null,
        imageUrls: validatedImageUrls.length > 0 ? validatedImageUrls : undefined,
        status: 'PENDING',
        createdBy: user.userId, // Customer who reported the issue
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Your issue has been reported. Our team will review it and get back to you shortly.',
      resolutionId: resolution.id,
    });
  } catch (error) {
    console.error('Report issue error:', error);
    return handleApiError(error);
  }
}
