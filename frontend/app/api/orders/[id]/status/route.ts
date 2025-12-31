import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { updateIncomeStatus } from '@/lib/server/accounting-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/orders/[id]/status
 * Update order status (admin only)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        design: {
          select: {
            id: true,
            title: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Auto-accounting: Update income status when order is delivered
    if (status === 'delivered') {
      try {
        await updateIncomeStatus(id, 'CONFIRMED');
      } catch (accountingError) {
        console.error('Failed to update income status:', accountingError);
      }
    }

    return NextResponse.json({
      success: true,
      data: { order },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
