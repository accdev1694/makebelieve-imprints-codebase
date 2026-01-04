import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/orders/track/[token]
 * Public endpoint to view order status via share token
 * No authentication required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || token.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Invalid tracking token' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { shareToken: token },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: {
                  select: { imageUrl: true },
                  take: 1,
                  orderBy: { displayOrder: 'asc' },
                },
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        design: {
          select: {
            id: true,
            title: true,
            previewUrl: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Sanitize shipping address - only show partial info
    const shippingAddress = order.shippingAddress as {
      name?: string;
      city?: string;
      postcode?: string;
      country?: string;
    };

    const sanitizedAddress = {
      name: shippingAddress.name || 'Customer',
      city: shippingAddress.city || '',
      country: shippingAddress.country || 'United Kingdom',
      // Only show first part of postcode for privacy
      postcodeArea: shippingAddress.postcode?.split(' ')[0] || '',
    };

    // Format items for response
    const items = order.items.map((item) => ({
      id: item.id,
      productName: item.product?.name || 'Product',
      productImage: item.product?.images[0]?.imageUrl || '/placeholder.jpg',
      variantName: item.variant?.name || null,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
    }));

    return NextResponse.json({
      success: true,
      data: {
        order: {
          id: order.id,
          status: order.status,
          totalPrice: Number(order.totalPrice),
          subtotal: order.subtotal ? Number(order.subtotal) : null,
          discountAmount: order.discountAmount ? Number(order.discountAmount) : null,
          trackingNumber: order.trackingNumber,
          carrier: order.carrier,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
          shippingAddress: sanitizedAddress,
          items,
          design: order.design
            ? {
                title: order.design.title,
                previewUrl: order.design.previewUrl,
              }
            : null,
        },
      },
    });
  } catch (error) {
    console.error('[Track Order] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
