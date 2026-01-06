/**
 * Cart Storage Functions
 *
 * localStorage persistence for cart data and selection state.
 */

import { CART } from '@/lib/config/constants';
import { CartItem } from './types';

/**
 * Load cart items from localStorage
 */
export function loadCartFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CART.STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.items && Array.isArray(parsed.items)) {
        return parsed.items;
      }
    }
  } catch (error) {
    console.error('Failed to load cart from localStorage:', error);
  }
  return [];
}

/**
 * Save cart items to localStorage
 */
export function saveCartToStorage(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      CART.STORAGE_KEY,
      JSON.stringify({
        items,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.error('Failed to save cart to localStorage:', error);
  }
}

/**
 * Clear cart from localStorage
 */
export function clearCartStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CART.STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear cart from localStorage:', error);
  }
}

/**
 * Load cart selection from localStorage
 */
export function loadSelectionFromStorage(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(CART.SELECTION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch (error) {
    console.error('Failed to load cart selection from localStorage:', error);
  }
  return new Set();
}

/**
 * Save cart selection to localStorage
 */
export function saveSelectionToStorage(selectedIds: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART.SELECTION_KEY, JSON.stringify([...selectedIds]));
  } catch (error) {
    console.error('Failed to save cart selection to localStorage:', error);
  }
}

/**
 * Clear cart selection from localStorage
 */
export function clearSelectionStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CART.SELECTION_KEY);
  } catch (error) {
    console.error('Failed to clear cart selection from localStorage:', error);
  }
}
