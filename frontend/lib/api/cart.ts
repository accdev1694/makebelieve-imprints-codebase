import apiClient from './client';

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
  customization?: {
    type: 'TEMPLATE_BASED' | 'UPLOAD_OWN' | 'FULLY_CUSTOM';
    templateId?: string;
    templateName?: string;
    designId?: string;
    designUrl?: string;
  };
  addedAt: string;
}

export interface AddToCartRequest {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  customization?: CartItemResponse['customization'];
}

export interface SyncCartItem {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  customization?: CartItemResponse['customization'];
  addedAt?: string;
}

/**
 * Get user's cart from server
 */
export async function getCart(): Promise<CartItemResponse[]> {
  const response = await apiClient.get('/cart');
  return response.data.data.items;
}

/**
 * Add item to cart
 */
export async function addToCart(item: AddToCartRequest): Promise<CartItemResponse> {
  const response = await apiClient.post('/cart', item);
  return response.data.data.item;
}

/**
 * Update cart item quantity
 */
export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<CartItemResponse | { deleted: boolean }> {
  const response = await apiClient.put(`/cart/${itemId}`, { quantity });
  return response.data.data.item || response.data.data;
}

/**
 * Remove item from cart
 */
export async function removeFromCart(itemId: string): Promise<void> {
  await apiClient.delete(`/cart/${itemId}`);
}

/**
 * Sync localStorage cart with server
 * Used when guest logs in
 */
export async function syncCart(items: SyncCartItem[]): Promise<CartItemResponse[]> {
  const response = await apiClient.post('/cart/sync', { items });
  return response.data.data.items;
}

/**
 * Clear all items from cart
 * Used after successful checkout
 */
export async function clearCart(): Promise<void> {
  await apiClient.delete('/cart/clear');
}

export const cartService = {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  syncCart,
  clearCart,
};

export default cartService;
