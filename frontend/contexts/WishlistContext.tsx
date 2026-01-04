'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { wishlistService, WishlistItemResponse } from '@/lib/api/wishlist';

// Wishlist item structure (unified for local and server)
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
  isSyncing: boolean;
  addItem: (payload: AddToWishlistPayload) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  toggleItem: (payload: AddToWishlistPayload) => boolean;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const WISHLIST_STORAGE_KEY = 'mkbl_wishlist';

// Generate unique ID for wishlist items (guest mode)
function generateWishlistItemId(): string {
  return `wish_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Transform server response to local WishlistItem format
function transformServerItem(item: WishlistItemResponse): WishlistItem {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    productSlug: item.product.slug,
    productImage: item.product.image,
    price: item.product.price,
    addedAt: item.createdAt,
  };
}

// Load items from localStorage
function loadFromLocalStorage(): WishlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.items && Array.isArray(parsed.items)) {
        return parsed.items;
      }
    }
  } catch (error) {
    console.error('Failed to load wishlist from localStorage:', error);
  }
  return [];
}

// Save items to localStorage
function saveToLocalStorage(items: WishlistItem[]) {
  if (typeof window === 'undefined') return;
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

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const lastUserIdRef = useRef<string | null>(null);
  const hasSyncedRef = useRef(false);

  // Load wishlist from localStorage on mount (for immediate display)
  useEffect(() => {
    const localItems = loadFromLocalStorage();
    setItems(localItems);
    setIsInitialized(true);
  }, []);

  // Sync with server when user logs in
  useEffect(() => {
    const userId = user?.id || null;

    // If user changed (login/logout), reset sync flag
    if (userId !== lastUserIdRef.current) {
      hasSyncedRef.current = false;
      lastUserIdRef.current = userId;
    }

    // If no user, we're in guest mode - localStorage is source of truth
    if (!userId) {
      return;
    }

    // If already synced for this user, skip
    if (hasSyncedRef.current) {
      return;
    }

    // Sync with server
    const syncWithServer = async () => {
      setIsSyncing(true);
      try {
        // Get current localStorage items
        const localItems = loadFromLocalStorage();

        let serverItems: WishlistItemResponse[];

        if (localItems.length > 0) {
          // Merge localStorage with server
          serverItems = await wishlistService.syncWishlist(
            localItems.map((item) => ({
              productId: item.productId,
              addedAt: item.addedAt,
            }))
          );
        } else {
          // Just fetch server wishlist
          serverItems = await wishlistService.getWishlist();
        }

        // Transform and set items
        const mergedItems = serverItems.map(transformServerItem);
        setItems(mergedItems);
        saveToLocalStorage(mergedItems);
        hasSyncedRef.current = true;
      } catch (error) {
        console.error('Failed to sync wishlist with server:', error);
        // Keep localStorage items on error - don't break the experience
      } finally {
        setIsSyncing(false);
      }
    };

    syncWithServer();
  }, [user?.id]);

  // Save to localStorage whenever items change (after initial load)
  useEffect(() => {
    if (isInitialized) {
      saveToLocalStorage(items);
    }
  }, [items, isInitialized]);

  const itemCount = items.length;

  // Check if product is in wishlist
  const isInWishlist = useCallback(
    (productId: string) => {
      return items.some((item) => item.productId === productId);
    },
    [items]
  );

  // Add item to wishlist
  const addItem = useCallback(
    (payload: AddToWishlistPayload) => {
      // Optimistic update
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

      // If logged in, sync with server
      if (user) {
        wishlistService.addToWishlist(payload.productId).catch((error) => {
          console.error('Failed to add item to server wishlist:', error);
          // Revert on error
          setItems((currentItems) =>
            currentItems.filter((item) => item.productId !== payload.productId)
          );
        });
      }
    },
    [user]
  );

  // Remove item from wishlist by productId
  const removeItem = useCallback(
    (productId: string) => {
      // Save current state for potential revert
      const previousItems = items;

      // Optimistic update
      setItems((currentItems) => currentItems.filter((item) => item.productId !== productId));

      // If logged in, sync with server
      if (user) {
        wishlistService.removeFromWishlist(productId).catch((error) => {
          console.error('Failed to remove item from server wishlist:', error);
          // Revert on error
          setItems(previousItems);
        });
      }
    },
    [user, items]
  );

  // Toggle item in wishlist - returns true if added, false if removed
  const toggleItem = useCallback(
    (payload: AddToWishlistPayload): boolean => {
      const isCurrentlyInWishlist = isInWishlist(payload.productId);

      if (isCurrentlyInWishlist) {
        removeItem(payload.productId);
        return false;
      } else {
        addItem(payload);
        return true;
      }
    },
    [isInWishlist, removeItem, addItem]
  );

  // Clear all items from wishlist
  const clearWishlist = useCallback(() => {
    setItems([]);
    // Note: No server endpoint for bulk delete - items cleared locally
    // They will be re-synced on next login if not implemented
  }, []);

  return (
    <WishlistContext.Provider
      value={{
        items,
        itemCount,
        isSyncing,
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
