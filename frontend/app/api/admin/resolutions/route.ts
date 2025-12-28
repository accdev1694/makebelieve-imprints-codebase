import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

/**
 * GET /api/admin/resolutions
 * Get all resolutions with order details (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // REPRINT or REFUND
    const status = searchParams.get('status'); // PENDING, PROCESSING, COMPLETED, FAILED

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const resolutions = await prisma.resolution.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            totalPrice: true,
            status: true,
            createdAt: true,
            shippingAddress: true,
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
    });

    return NextResponse.json({
      resolutions,
    });
  } catch (error) {
    console.error('Get resolutions error:', error);
    return handleApiError(error);
  }
}
