import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { OrderStatus } from '@prisma/client';
import { recordPromoUsage } from '@/lib/server/promo-service';

/**
 * GET /api/orders
 * List orders (user's own or all for admin)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;
    const status = searchParams.get('status') as OrderStatus | null;

    const where =
      user.type === 'admin'
        ? { ...(status && { status }) }
        : { customerId: user.userId, ...(status && { status }) };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          design: {
            select: {
              id: true,
              title: true,
              fileUrl: true,
              previewUrl: true,
            },
          },
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
                select: {
                  id: true,
                  name: true,
                  slug: true,
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
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              total: true,
            },
          },
          payment: {
            select: {
              id: true,
              status: true,
              paymentMethod: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/orders
 * Create a new order
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    // Support both single design orders and multi-item cart orders
    if (body.items && Array.isArray(body.items)) {
      // Multi-item cart order
      const order = await prisma.order.create({
        data: {
          customerId: user.userId,
          subtotal: body.subtotal,
          discountAmount: body.discountAmount,
          promoCode: body.promoCode,
          totalPrice: body.totalPrice,
          shippingAddress: body.shippingAddress,
          status: 'pending',
          items: {
            create: body.items.map((item: any) => ({
              productId: item.productId,
              variantId: item.variantId,
              designId: item.designId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              customization: item.customization,
              metadata: item.metadata,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
              variant: true,
              design: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Record promo usage if a promo code was applied
      if (body.promoCode && body.discountAmount > 0) {
        await recordPromoUsage(body.promoCode, {
          userId: user.userId,
          email: user.email,
          orderId: order.id,
          discountAmount: body.discountAmount,
        });
      }

      return NextResponse.json(
        { success: true, data: { order } },
        { status: 201 }
      );
    } else {
      // Legacy single design order
      const { designId, ...orderData } = body;

      if (designId) {
        // Verify design exists and belongs to user
        const design = await prisma.design.findUnique({
          where: { id: designId },
        });

        if (!design) {
          return NextResponse.json(
            { error: 'Design not found' },
            { status: 404 }
          );
        }

        if (design.userId !== user.userId) {
          return NextResponse.json(
            { error: 'Design does not belong to you' },
            { status: 403 }
          );
        }
      }

      const order = await prisma.order.create({
        data: {
          ...orderData,
          designId,
          customerId: user.userId,
        },
        include: {
          design: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json(
        { success: true, data: { order } },
        { status: 201 }
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}
