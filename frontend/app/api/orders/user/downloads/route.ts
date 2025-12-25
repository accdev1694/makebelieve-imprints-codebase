import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

/**
 * GET /api/orders/user/downloads
 * List all digital downloads for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Find all orders with digital products
    const orders = await prisma.order.findMany({
      where: {
        customerId: user.userId,
        status: {
          in: ['confirmed', 'printing', 'shipped', 'delivered'],
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                customizationType: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter to only digital products
    const digitalDownloads = orders.flatMap(order =>
      order.items
        .filter(item => item.product?.customizationType === 'DIGITAL_DOWNLOAD')
        .map(item => ({
          orderId: order.id,
          orderItemId: item.id,
          orderDate: order.createdAt,
          orderStatus: order.status,
          product: item.product,
          quantity: item.quantity,
        }))
    );

    return NextResponse.json({
      success: true,
      data: {
        downloads: digitalDownloads,
        total: digitalDownloads.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
