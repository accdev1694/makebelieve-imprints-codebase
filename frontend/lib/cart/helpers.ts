/**
 * Cart Helper Functions
 *
 * Utility functions for cart item manipulation.
 */

import { CartItem } from './types';
import { CartItemResponse } from '@/lib/api/cart';

/**
 * Generate unique ID for cart items (guest mode)
 */
export function generateCartItemId(): string {
  return `cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Transform server response to local CartItem format
 */
export function transformServerItem(item: CartItemResponse): CartItem {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    productSlug: item.productSlug,
    productImage: item.productImage,
    variantId: item.variantId,
    variantName: item.variantName,
    size: item.size,
    color: item.color,
    material: item.material,
    finish: item.finish,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    customization: item.customization,
    addedAt: item.addedAt,
  };
}

/**
 * Deep equality comparison for objects
 * Safe alternative to JSON.stringify comparison (handles key ordering)
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  // Handle primitive types and null/undefined
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }

  // Handle objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);

    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    );
  }

  return false;
}
