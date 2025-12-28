import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/orders/[id]/issues
 * Get issues for a specific order (customer can only see their own)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id: orderId } = await params;

    // Verify the order belongs to this customer
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { customerId: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.customerId !== user.userId) {
      return NextResponse.json(
        { error: 'You can only view issues for your own orders' },
        { status: 403 }
      );
    }

    // Get all issues for this order
    const issues = await prisma.resolution.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        reason: true,
        notes: true,
        imageUrls: true,
        status: true,
        createdAt: true,
        processedAt: true,
        reprintOrderId: true,
        refundAmount: true,
      },
    });

    return NextResponse.json({ issues });
  } catch (error) {
    console.error('Get order issues error:', error);
    return handleApiError(error);
  }
}
