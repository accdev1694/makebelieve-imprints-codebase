import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

interface SyncItem {
  productId: string;
  addedAt?: string;
}

/**
 * POST /api/wishlist/sync
 * Merge localStorage items with server wishlist
 * Used when guest logs in to sync their local wishlist
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

    // Filter to valid product IDs
    const productIds = items
      .map((item) => item.productId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    if (productIds.length > 0) {
      // Find which products exist
      const existingProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true },
      });

      const validProductIds = new Set(existingProducts.map((p) => p.id));

      // Upsert all valid items in a transaction
      await prisma.$transaction(
        items
          .filter((item) => validProductIds.has(item.productId))
          .map((item) =>
            prisma.wishlistItem.upsert({
              where: {
                userId_productId: {
                  userId: user.userId,
                  productId: item.productId,
                },
              },
              update: {},
              create: {
                userId: user.userId,
                productId: item.productId,
              },
            })
          )
      );
    }

    // Fetch and return the full merged wishlist
    const wishlistItems = await prisma.wishlistItem.findMany({
      where: { userId: user.userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            status: true,
            images: {
              select: { imageUrl: true },
              take: 1,
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mergedItems = wishlistItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      createdAt: item.createdAt.toISOString(),
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        price: Number(item.product.basePrice),
        image: item.product.images[0]?.imageUrl || '/placeholder.jpg',
        status: item.product.status,
      },
    }));

    return NextResponse.json({
      success: true,
      data: { items: mergedItems },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
