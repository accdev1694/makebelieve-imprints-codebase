import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { OrderStatus } from '@prisma/client';
import { recordPromoUsage } from '@/lib/server/promo-service';

// Order statuses considered "archived" (concluded)
const ARCHIVED_STATUSES: OrderStatus[] = ['delivered', 'cancelled', 'refunded'];
// Order statuses considered "active" (needs attention)
const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'printing', 'shipped'];

/**
 * GET /api/orders
 * List orders (user's own or all for admin)
 * Query params:
 * - page: page number (default 1)
 * - limit: items per page (default 20, max 100)
 * - status: filter by specific status
 * - archived: if 'true', show only archived orders; if 'false', show only active orders
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;
    const status = searchParams.get('status') as OrderStatus | null;
    const archivedParam = searchParams.get('archived');

    // Build status filter based on archived param
    let statusFilter: { status?: OrderStatus | { in: OrderStatus[] } } = {};
    if (status) {
      statusFilter = { status };
    } else if (archivedParam === 'true') {
      statusFilter = { status: { in: ARCHIVED_STATUSES } };
    } else if (archivedParam === 'false') {
      statusFilter = { status: { in: ACTIVE_STATUSES } };
    }

    const where =
      user.type === 'admin'
        ? { ...statusFilter }
        : { customerId: user.userId, ...statusFilter };

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
      // Multi-item cart order - use transaction to ensure atomicity
      const order = await prisma.$transaction(async (tx) => {
        // Create the order
        const newOrder = await tx.order.create({
          data: {
            customerId: user.userId,
            subtotal: body.subtotal,
            discountAmount: body.discountAmount,
            promoCode: body.promoCode,
            totalPrice: body.totalPrice,
            shippingAddress: body.shippingAddress,
            status: 'pending',
            items: {
              create: body.items.map((item: { productId: string; variantId?: string; designId?: string; quantity: number; unitPrice: number; totalPrice: number; customization?: unknown; metadata?: unknown }) => ({
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

        // Record promo usage within the same transaction if a promo code was applied
        if (body.promoCode && body.discountAmount > 0) {
          const promo = await tx.promo.findUnique({
            where: { code: body.promoCode.toUpperCase() },
          });

          if (promo) {
            await tx.promoUsage.create({
              data: {
                promoId: promo.id,
                userId: user.userId,
                email: user.email?.toLowerCase(),
                orderId: newOrder.id,
                discountAmount: body.discountAmount,
              },
            });

            await tx.promo.update({
              where: { id: promo.id },
              data: { currentUses: { increment: 1 } },
            });
          }
        }

        return newOrder;
      });

      return NextResponse.json(
        { success: true, data: { order } },
        { status: 201 }
      );
    } else {
      // Legacy single design order - also use transaction for promo atomicity
      const { designId, promoCode, discountAmount, ...orderData } = body;

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

      const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            ...orderData,
            designId,
            promoCode,
            discountAmount,
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

        // Record promo usage for legacy orders too
        if (promoCode && discountAmount > 0) {
          const promo = await tx.promo.findUnique({
            where: { code: promoCode.toUpperCase() },
          });

          if (promo) {
            await tx.promoUsage.create({
              data: {
                promoId: promo.id,
                userId: user.userId,
                email: user.email?.toLowerCase(),
                orderId: newOrder.id,
                discountAmount: discountAmount,
              },
            });

            await tx.promo.update({
              where: { id: promo.id },
              data: { currentUses: { increment: 1 } },
            });
          }
        }

        return newOrder;
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
