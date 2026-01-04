import apiClient from './client';

export interface WishlistProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  status: string;
}

export interface WishlistItemResponse {
  id: string;
  productId: string;
  createdAt: string;
  product: WishlistProduct;
}

export interface SyncWishlistItem {
  productId: string;
  addedAt?: string;
}

/**
 * Get user's wishlist from server
 */
export async function getWishlist(): Promise<WishlistItemResponse[]> {
  const response = await apiClient.get('/wishlist');
  return response.data.data.items;
}

/**
 * Add item to wishlist
 */
export async function addToWishlist(productId: string): Promise<WishlistItemResponse> {
  const response = await apiClient.post('/wishlist', { productId });
  return response.data.data.item;
}

/**
 * Remove item from wishlist
 */
export async function removeFromWishlist(productId: string): Promise<void> {
  await apiClient.delete(`/wishlist/${productId}`);
}

/**
 * Sync localStorage wishlist with server
 * Used when guest logs in
 */
export async function syncWishlist(items: SyncWishlistItem[]): Promise<WishlistItemResponse[]> {
  const response = await apiClient.post('/wishlist/sync', { items });
  return response.data.data.items;
}

export const wishlistService = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  syncWishlist,
};

export default wishlistService;
