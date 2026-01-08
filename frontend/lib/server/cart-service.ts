/**
 * Cart Service
 * Handles all cart business logic for customers
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// ============================================
// Types
// ============================================

export interface CartItemResponse {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  variantId?: string;
  variantName?: string;
  size?: string;
  color?: string;
  material?: string;
  finish?: string;
  quantity: number;
  unitPrice: number;
  customization?: object;
  addedAt: string;
}

export interface AddCartItemData {
  productId: string;
  variantId?: string;
  quantity?: number;
  unitPrice: number;
  customization?: object;
}

export interface SyncCartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  customization?: object;
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

// Common includes for cart item queries - use const for type inference
const cartItemIncludes = Prisma.validator<Prisma.CartItemInclude>()({
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
});

type CartItemWithRelations = Prisma.CartItemGetPayload<{ include: typeof cartItemIncludes }>;

// ============================================
// Helper Functions
// ============================================

/**
 * Transform a cart item from database format to API response format
 */
export function transformCartItem(item: CartItemWithRelations): CartItemResponse {
  return {
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
  };
}

// ============================================
// Cart Operations
// ============================================

/**
 * Get all cart items for a user
 */
export async function getCartItems(userId: string): Promise<ServiceResult<{ items: CartItemResponse[] }>> {
  const cartItems = (await prisma.cartItem.findMany({
    where: { userId },
    include: cartItemIncludes,
    orderBy: { addedAt: 'desc' },
  })) as CartItemWithRelations[];

  const items = cartItems.map(transformCartItem);

  return {
    success: true,
    data: { items },
  };
}

/**
 * Add an item to the cart (or update quantity if already exists)
 */
export async function addCartItem(
  userId: string,
  data: AddCartItemData
): Promise<ServiceResult<{ item: CartItemResponse; isNew: boolean }>> {
  const { productId, variantId, quantity = 1, unitPrice, customization } = data;

  // Validate required fields
  if (!productId) {
    return { success: false, error: 'productId is required' };
  }

  if (typeof unitPrice !== 'number' || unitPrice < 0) {
    return { success: false, error: 'Valid unitPrice is required' };
  }

  // Run all validation queries in parallel for better performance
  const [product, variant, existingItem] = await Promise.all([
    // Check if product exists and is active
    prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        status: true,
      },
    }),
    // Check if variant exists (if specified)
    variantId
      ? prisma.productVariant.findUnique({
          where: { id: variantId },
          select: { id: true },
        })
      : Promise.resolve(null),
    // Check if item already exists in cart
    prisma.cartItem.findFirst({
      where: {
        userId,
        productId,
        variantId: variantId || null,
      },
    }),
  ]);

  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  if (product.status !== 'ACTIVE') {
    return { success: false, error: 'Product is not available' };
  }

  if (variantId && !variant) {
    return { success: false, error: 'Variant not found' };
  }

  let cartItem: CartItemWithRelations;
  let isNew = false;

  if (existingItem) {
    // Update quantity
    const customizationValue = customization || existingItem.customization;
    cartItem = (await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: {
        quantity: existingItem.quantity + quantity,
        unitPrice,
        ...(customizationValue && { customization: customizationValue as Prisma.InputJsonValue }),
      },
      include: cartItemIncludes,
    })) as CartItemWithRelations;
  } else {
    // Create new item
    isNew = true;
    cartItem = (await prisma.cartItem.create({
      data: {
        userId,
        productId,
        variantId: variantId || null,
        quantity,
        unitPrice,
        ...(customization && { customization: customization as Prisma.InputJsonValue }),
      },
      include: cartItemIncludes,
    })) as CartItemWithRelations;
  }

  return {
    success: true,
    data: {
      item: transformCartItem(cartItem),
      isNew,
    },
  };
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(
  userId: string,
  itemId: string,
  quantity: number
): Promise<ServiceResult<{ item?: CartItemResponse; deleted?: boolean }>> {
  if (typeof quantity !== 'number' || quantity < 0) {
    return { success: false, error: 'Valid quantity is required' };
  }

  // Find the cart item (must belong to user)
  const existingItem = await prisma.cartItem.findFirst({
    where: {
      id: itemId,
      userId,
    },
  });

  if (!existingItem) {
    return { success: false, error: 'Cart item not found' };
  }

  // If quantity is 0, delete the item
  if (quantity === 0) {
    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    return {
      success: true,
      data: { deleted: true },
    };
  }

  // Update quantity
  const updatedItem = (await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
    include: cartItemIncludes,
  })) as CartItemWithRelations;

  return {
    success: true,
    data: {
      item: transformCartItem(updatedItem),
    },
  };
}

/**
 * Remove an item from the cart
 */
export async function deleteCartItem(
  userId: string,
  itemId: string
): Promise<ServiceResult<{ deleted: boolean }>> {
  // Find the cart item (must belong to user)
  const existingItem = await prisma.cartItem.findFirst({
    where: {
      id: itemId,
      userId,
    },
  });

  if (!existingItem) {
    return { success: false, error: 'Cart item not found' };
  }

  await prisma.cartItem.delete({
    where: { id: itemId },
  });

  return {
    success: true,
    data: { deleted: true },
  };
}

/**
 * Clear all items from user's cart
 */
export async function clearCart(userId: string): Promise<ServiceResult<{ cleared: boolean }>> {
  await prisma.cartItem.deleteMany({
    where: { userId },
  });

  return {
    success: true,
    data: { cleared: true },
  };
}

/**
 * Sync localStorage cart with server cart (used on login)
 */
export async function syncCart(
  userId: string,
  items: SyncCartItem[]
): Promise<ServiceResult<{ items: CartItemResponse[] }>> {
  if (!Array.isArray(items)) {
    return { success: false, error: 'items must be an array' };
  }

  // Filter to valid items
  const validItems = items.filter(
    (item): item is SyncCartItem =>
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
            userId,
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
              ...(item.customization && { customization: item.customization as Prisma.InputJsonValue }),
            },
          });
        } else {
          // Create new item
          await tx.cartItem.create({
            data: {
              userId,
              productId: item.productId,
              variantId: item.variantId || null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              ...(item.customization && { customization: item.customization as Prisma.InputJsonValue }),
            },
          });
        }
      }
    });
  }

  // Fetch and return the full merged cart
  const cartItems = (await prisma.cartItem.findMany({
    where: { userId },
    include: cartItemIncludes,
    orderBy: { addedAt: 'desc' },
  })) as CartItemWithRelations[];

  const mergedItems = cartItems.map(transformCartItem);

  return {
    success: true,
    data: { items: mergedItems },
  };
}
