'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Wishlist item structure
export interface WishlistItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  price: number;
  addedAt: string;
}

// Payload for adding items to wishlist
export interface AddToWishlistPayload {
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  price: number;
}

interface WishlistContextType {
  items: WishlistItem[];
  itemCount: number;
  addItem: (payload: AddToWishlistPayload) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  toggleItem: (payload: AddToWishlistPayload) => boolean;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_STORAGE_KEY = 'mkbl_wishlist';

// Generate unique ID for wishlist items
function generateWishlistItemId(): string {
  return `wish_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load wishlist from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.items && Array.isArray(parsed.items)) {
          setItems(parsed.items);
        }
      }
    } catch (error) {
      console.error('Failed to load wishlist from localStorage:', error);
    }
    setIsInitialized(true);
  }, []);

  // Save wishlist to localStorage whenever items change (after initial load)
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(
          WISHLIST_STORAGE_KEY,
          JSON.stringify({
            items,
            updatedAt: new Date().toISOString(),
          })
        );
      } catch (error) {
        console.error('Failed to save wishlist to localStorage:', error);
      }
    }
  }, [items, isInitialized]);

  const itemCount = items.length;

  // Check if product is in wishlist
  const isInWishlist = useCallback((productId: string) => {
    return items.some((item) => item.productId === productId);
  }, [items]);

  // Add item to wishlist
  const addItem = useCallback((payload: AddToWishlistPayload) => {
    setItems((currentItems) => {
      // Check if already in wishlist
      if (currentItems.some((item) => item.productId === payload.productId)) {
        return currentItems;
      }

      // Add new item
      const newItem: WishlistItem = {
        id: generateWishlistItemId(),
        ...payload,
        addedAt: new Date().toISOString(),
      };
      return [...currentItems, newItem];
    });
  }, []);

  // Remove item from wishlist by productId
  const removeItem = useCallback((productId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.productId !== productId));
  }, []);

  // Toggle item in wishlist - returns true if added, false if removed
  const toggleItem = useCallback((payload: AddToWishlistPayload): boolean => {
    let wasAdded = false;
    setItems((currentItems) => {
      const existingIndex = currentItems.findIndex((item) => item.productId === payload.productId);

      if (existingIndex >= 0) {
        // Remove item
        wasAdded = false;
        return currentItems.filter((_, index) => index !== existingIndex);
      } else {
        // Add item
        wasAdded = true;
        const newItem: WishlistItem = {
          id: generateWishlistItemId(),
          ...payload,
          addedAt: new Date().toISOString(),
        };
        return [...currentItems, newItem];
      }
    });
    return wasAdded;
  }, []);

  // Clear all items from wishlist
  const clearWishlist = useCallback(() => {
    setItems([]);
  }, []);

  return (
    <WishlistContext.Provider
      value={{
        items,
        itemCount,
        addItem,
        removeItem,
        isInWishlist,
        toggleItem,
        clearWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
