import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

interface SyncItem {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  customization?: object;
  addedAt?: string;
}

/**
 * POST /api/cart/sync
 * Merge localStorage cart with server cart
 * Used when guest logs in to sync their local cart
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const { items } = body as { items: SyncItem[] };

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: 'items must be an array' },
        { status: 400 }
      );
    }

    // Filter to valid items with product IDs
    const validItems = items.filter(
      (item): item is SyncItem =>
        typeof item.productId === 'string' &&
        item.productId.length > 0 &&
        typeof item.quantity === 'number' &&
        item.quantity > 0 &&
        typeof item.unitPrice === 'number' &&
        item.unitPrice >= 0
    );

    if (validItems.length > 0) {
      // Get product IDs to validate
      const productIds = validItems.map((item) => item.productId);

      // Find which products exist and are active
      const existingProducts = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      const validProductIds = new Set(existingProducts.map((p) => p.id));

      // Upsert all valid items in a transaction
      await prisma.$transaction(async (tx) => {
        for (const item of validItems.filter((item) => validProductIds.has(item.productId))) {
          // Find existing item with same product/variant combination
          const existing = await tx.cartItem.findFirst({
            where: {
              userId: user.userId,
              productId: item.productId,
              variantId: item.variantId || null,
            },
          });

          if (existing) {
            // Update existing item (take the higher quantity)
            await tx.cartItem.update({
              where: { id: existing.id },
              data: {
                quantity: Math.max(existing.quantity, item.quantity),
                unitPrice: item.unitPrice,
                customization: item.customization || undefined,
              },
            });
          } else {
            // Create new item
            await tx.cartItem.create({
              data: {
                userId: user.userId,
                productId: item.productId,
                variantId: item.variantId || null,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                customization: item.customization || undefined,
              },
            });
          }
        }
      });
    }

    // Fetch and return the full merged cart
    const cartItems = await prisma.cartItem.findMany({
      where: { userId: user.userId },
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
            size: true,
            color: true,
            material: true,
            finish: true,
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    const mergedItems = cartItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      productSlug: item.product.slug,
      productImage: item.product.images[0]?.imageUrl || '/placeholder.jpg',
      variantId: item.variantId || undefined,
      variantName: item.variant?.name || undefined,
      size: item.variant?.size || undefined,
      color: item.variant?.color || undefined,
      material: item.variant?.material || undefined,
      finish: item.variant?.finish || undefined,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      customization: item.customization as object | undefined,
      addedAt: item.addedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: { items: mergedItems },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
