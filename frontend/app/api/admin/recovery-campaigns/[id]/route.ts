import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

/**
 * GET /api/admin/recovery-campaigns/[id]
 * Get single campaign details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const campaign = await prisma.recoveryCampaign.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        promo: {
          select: {
            id: true,
            code: true,
            discountType: true,
            discountValue: true,
            usages: {
              select: {
                id: true,
                usedAt: true,
                discountAmount: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get related items (cart or wishlist)
    let triggerItems: Array<{ productId: string; productName: string; productImage: string; price: number }> = [];

    if (campaign.type === 'CART') {
      const cartItems = await prisma.cartItem.findMany({
        where: { userId: campaign.userId },
        include: {
          product: {
            select: {
              name: true,
              images: {
                select: { imageUrl: true },
                take: 1,
                orderBy: { displayOrder: 'asc' },
              },
            },
          },
        },
      });

      triggerItems = cartItems.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.images[0]?.imageUrl || '/placeholder.jpg',
        price: Number(item.unitPrice),
      }));
    } else {
      const wishlistItems = await prisma.wishlistItem.findMany({
        where: { userId: campaign.userId },
        include: {
          product: {
            select: {
              name: true,
              basePrice: true,
              images: {
                select: { imageUrl: true },
                take: 1,
                orderBy: { displayOrder: 'asc' },
              },
            },
          },
        },
      });

      triggerItems = wishlistItems.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.images[0]?.imageUrl || '/placeholder.jpg',
        price: Number(item.product.basePrice),
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        campaign: {
          id: campaign.id,
          user: {
            id: campaign.user.id,
            email: campaign.user.email,
            name: campaign.user.name || campaign.user.email,
          },
          type: campaign.type,
          status: campaign.status,
          itemCount: campaign.triggerItemCount,
          totalValue: campaign.triggerTotalValue ? Number(campaign.triggerTotalValue) : null,
          oldestItemDate: campaign.oldestItemDate.toISOString(),
          promoCode: campaign.promoCode,
          promo: campaign.promo
            ? {
                id: campaign.promo.id,
                code: campaign.promo.code,
                discountType: campaign.promo.discountType,
                discountValue: Number(campaign.promo.discountValue),
                usages: campaign.promo.usages.map((u) => ({
                  id: u.id,
                  usedAt: u.usedAt.toISOString(),
                  discountAmount: Number(u.discountAmount),
                })),
              }
            : null,
          emailSentAt: campaign.emailSentAt?.toISOString() || null,
          convertedOrderId: campaign.convertedOrderId,
          convertedAt: campaign.convertedAt?.toISOString() || null,
          recoveredRevenue: campaign.recoveredRevenue ? Number(campaign.recoveredRevenue) : null,
          createdAt: campaign.createdAt.toISOString(),
          expiresAt: campaign.expiresAt.toISOString(),
        },
        triggerItems,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/admin/recovery-campaigns/[id]
 * Cancel a campaign
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const { action } = body;

    if (action !== 'cancel') {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    const campaign = await prisma.recoveryCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (!['PENDING', 'SENT'].includes(campaign.status)) {
      return NextResponse.json(
        { success: false, error: 'Campaign cannot be cancelled (already converted or expired)' },
        { status: 400 }
      );
    }

    // Cancel campaign and deactivate promo
    await prisma.$transaction([
      prisma.recoveryCampaign.update({
        where: { id },
        data: { status: 'CANCELLED' },
      }),
      ...(campaign.promoId
        ? [
            prisma.promo.update({
              where: { id: campaign.promoId },
              data: { isActive: false },
            }),
          ]
        : []),
    ]);

    return NextResponse.json({
      success: true,
      data: { cancelled: true },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
