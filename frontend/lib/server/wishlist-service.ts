/**
 * Wishlist Service
 * Handles all wishlist business logic for customers
 */

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// ============================================
// Types
// ============================================

export interface WishlistItemResponse {
  id: string;
  productId: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    image: string;
    status: string;
  };
}

export interface SyncWishlistItem {
  productId: string;
  addedAt?: string;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// Internal Types
// ============================================

// Common includes for wishlist item queries
const wishlistItemIncludes = Prisma.validator<Prisma.WishlistItemInclude>()({
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
});

type WishlistItemWithRelations = Prisma.WishlistItemGetPayload<{ include: typeof wishlistItemIncludes }>;

// ============================================
// Helper Functions
// ============================================

/**
 * Transform a wishlist item from database format to API response format
 */
function transformWishlistItem(item: WishlistItemWithRelations): WishlistItemResponse {
  return {
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
  };
}

// ============================================
// Wishlist Operations
// ============================================

/**
 * Get all wishlist items for a user
 */
export async function getWishlistItems(userId: string): Promise<ServiceResult<{ items: WishlistItemResponse[] }>> {
  const wishlistItems = (await prisma.wishlistItem.findMany({
    where: { userId },
    include: wishlistItemIncludes,
    orderBy: { createdAt: 'desc' },
  })) as WishlistItemWithRelations[];

  const items = wishlistItems.map(transformWishlistItem);

  return {
    success: true,
    data: { items },
  };
}

/**
 * Add an item to the wishlist
 */
export async function addWishlistItem(
  userId: string,
  productId: string
): Promise<ServiceResult<{ item: WishlistItemResponse }>> {
  // Validate required fields
  if (!productId) {
    return { success: false, error: 'productId is required' };
  }

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
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
  });

  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  // Upsert to handle duplicates gracefully
  const wishlistItem = await prisma.wishlistItem.upsert({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
    update: {},
    create: {
      userId,
      productId,
    },
  });

  return {
    success: true,
    data: {
      item: {
        id: wishlistItem.id,
        productId: wishlistItem.productId,
        createdAt: wishlistItem.createdAt.toISOString(),
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: Number(product.basePrice),
          image: product.images[0]?.imageUrl || '/placeholder.jpg',
          status: product.status,
        },
      },
    },
  };
}

/**
 * Remove an item from the wishlist by product ID
 */
export async function removeWishlistItem(
  userId: string,
  productId: string
): Promise<ServiceResult<{ removed: boolean }>> {
  const deleted = await prisma.wishlistItem.deleteMany({
    where: {
      userId,
      productId,
    },
  });

  if (deleted.count === 0) {
    return { success: false, error: 'Item not in wishlist' };
  }

  return {
    success: true,
    data: { removed: true },
  };
}

/**
 * Sync localStorage wishlist with server wishlist (used on login)
 */
export async function syncWishlist(
  userId: string,
  items: SyncWishlistItem[]
): Promise<ServiceResult<{ items: WishlistItemResponse[] }>> {
  if (!Array.isArray(items)) {
    return { success: false, error: 'items must be an array' };
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
                userId,
                productId: item.productId,
              },
            },
            update: {},
            create: {
              userId,
              productId: item.productId,
            },
          })
        )
    );
  }

  // Fetch and return the full merged wishlist
  const wishlistItems = (await prisma.wishlistItem.findMany({
    where: { userId },
    include: wishlistItemIncludes,
    orderBy: { createdAt: 'desc' },
  })) as WishlistItemWithRelations[];

  const mergedItems = wishlistItems.map(transformWishlistItem);

  return {
    success: true,
    data: { items: mergedItems },
  };
}
