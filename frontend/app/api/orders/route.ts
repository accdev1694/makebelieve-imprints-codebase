import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { OrderStatus } from '@prisma/client';
import { validateAndRecordPromoUsage } from '@/lib/server/promo-service';
import { checkRecoveryConversion, cancelUserCampaigns } from '@/lib/server/recovery-service';
import { redeemPoints } from '@/lib/server/points-service';
import { nanoid } from 'nanoid';
import {
  PAGINATION,
  TOKEN_LENGTH,
  TAB_STATUS_MAP,
  ARCHIVED_STATUSES,
  ACTIVE_STATUSES,
} from '@/lib/config/constants';

// Generate a unique share token for order tracking
function generateShareToken(): string {
  return nanoid(TOKEN_LENGTH.SHARE_TOKEN); // 16 character URL-safe token
}

// Valid sort fields and their Prisma orderBy mappings
type SortField = 'date' | 'price' | 'customer' | 'city' | 'status';
type SortOrder = 'asc' | 'desc';

/**
 * GET /api/orders
 * List orders (user's own or all for admin)
 * Query params:
 * - page: page number (default 1)
 * - limit: items per page (default 20, max 100)
 * - status: filter by specific status
 * - tab: filter by tab group ('all', 'in_progress', 'shipped', 'completed', 'cancelled')
 * - sort: sort field ('date', 'price', 'customer', 'city', 'status') - default 'date'
 * - order: sort order ('asc', 'desc') - default 'desc'
 * - archived: if 'true', show only archived orders; if 'false', show only active orders (legacy)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(PAGINATION.MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') || String(PAGINATION.DEFAULT_LIMIT), 10)));
    const skip = (page - 1) * limit;
    const status = searchParams.get('status') as OrderStatus | null;
    const tab = searchParams.get('tab');
    const archivedParam = searchParams.get('archived');
    const sortField = (searchParams.get('sort') as SortField) || 'date';
    const sortOrder = (searchParams.get('order') as SortOrder) || 'desc';

    // Build status filter based on tab, status, or archived param
    let statusFilter: { status?: OrderStatus | { in: OrderStatus[] } } = {};
    if (status) {
      // Direct status filter takes priority
      statusFilter = { status };
    } else if (tab && tab !== 'all' && tab in TAB_STATUS_MAP) {
      // Tab-based filtering (new approach)
      statusFilter = { status: { in: [...TAB_STATUS_MAP[tab as keyof typeof TAB_STATUS_MAP]] } };
    } else if (archivedParam === 'true') {
      // Legacy archived filter
      statusFilter = { status: { in: [...ARCHIVED_STATUSES] } };
    } else if (archivedParam === 'false') {
      // Legacy active filter
      statusFilter = { status: { in: [...ACTIVE_STATUSES] } };
    }

    // Build orderBy based on sort field
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orderBy: any;
    switch (sortField) {
      case 'price':
        orderBy = { totalPrice: sortOrder };
        break;
      case 'customer':
        // Sort by customer name via relation
        orderBy = { customer: { name: sortOrder } };
        break;
      case 'city':
        // Sort by city in shipping address JSON - requires raw query workaround
        // For now, fall back to date sorting as JSON field sorting is complex in Prisma
        // TODO: Implement proper JSON field sorting if needed
        orderBy = { createdAt: sortOrder };
        break;
      case 'status':
        orderBy = { status: sortOrder };
        break;
      case 'date':
      default:
        orderBy = { createdAt: sortOrder };
        break;
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
        orderBy,
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
            shareToken: generateShareToken(),
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

        // Validate and record promo usage within the same transaction if a promo code was applied
        // This prevents race conditions where multiple orders could bypass usage limits
        if (body.promoCode && body.discountAmount > 0) {
          const promoResult = await validateAndRecordPromoUsage(tx, body.promoCode, {
            userId: user.userId,
            email: user.email?.toLowerCase(),
            orderId: newOrder.id,
            discountAmount: body.discountAmount,
            cartTotal: body.subtotal || body.totalPrice,
          });

          if (!promoResult.success) {
            // Throw to rollback the transaction - the promo is no longer valid
            throw new Error(`Promo code error: ${promoResult.error}`);
          }
        }

        // Redeem loyalty points if requested
        if (body.pointsToRedeem && body.pointsToRedeem > 0) {
          const pointsResult = await redeemPoints(user.userId, body.pointsToRedeem, newOrder.id);

          // Update the order with points info
          await tx.order.update({
            where: { id: newOrder.id },
            data: {
              pointsUsed: body.pointsToRedeem,
              pointsDiscount: pointsResult.discountAmount,
            },
          });
        }

        return newOrder;
      });

      // Post-transaction: Check for recovery conversion and clear cart
      // These are non-critical and should not fail the order
      try {
        if (body.promoCode) {
          await checkRecoveryConversion(user.userId, order.id, body.promoCode, body.totalPrice);
        }
        // Cancel any pending recovery campaigns for this user
        await cancelUserCampaigns(user.userId);
        // Clear server cart
        await prisma.cartItem.deleteMany({ where: { userId: user.userId } });
      } catch (postOrderError) {
        console.error('[Orders] Post-order processing error (non-fatal):', postOrderError);
      }

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
            shareToken: generateShareToken(),
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

        // Validate and record promo usage for legacy orders too
        // This prevents race conditions where multiple orders could bypass usage limits
        if (promoCode && discountAmount > 0) {
          const promoResult = await validateAndRecordPromoUsage(tx, promoCode, {
            userId: user.userId,
            email: user.email?.toLowerCase(),
            orderId: newOrder.id,
            discountAmount: discountAmount,
            cartTotal: orderData.totalPrice,
          });

          if (!promoResult.success) {
            // Throw to rollback the transaction - the promo is no longer valid
            throw new Error(`Promo code error: ${promoResult.error}`);
          }
        }

        return newOrder;
      });

      // Post-transaction: Check for recovery conversion and clear cart
      // These are non-critical and should not fail the order
      try {
        if (promoCode) {
          await checkRecoveryConversion(user.userId, order.id, promoCode, orderData.totalPrice);
        }
        // Cancel any pending recovery campaigns for this user
        await cancelUserCampaigns(user.userId);
        // Clear server cart
        await prisma.cartItem.deleteMany({ where: { userId: user.userId } });
      } catch (postOrderError) {
        console.error('[Orders] Post-order processing error (non-fatal):', postOrderError);
      }

      return NextResponse.json(
        { success: true, data: { order } },
        { status: 201 }
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}
