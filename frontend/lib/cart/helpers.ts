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
