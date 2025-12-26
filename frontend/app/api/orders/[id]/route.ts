import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/orders/[id]
 * Get order details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        design: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                images: true,
              },
            },
            variant: true,
            design: true,
          },
        },
        invoice: true,
        payment: true,
        review: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Only owner or admin can view order
    if (order.customerId !== user.userId && user.type !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
