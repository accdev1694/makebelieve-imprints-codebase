'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cartService, CartItemResponse } from '@/lib/api/cart';

// Cart item structure
export interface CartItem {
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

// Payload for adding items to cart
export interface AddToCartPayload {
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
  customization?: CartItem['customization'];
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  tax: number;
  total: number;
  isOpen: boolean;
  isSyncing: boolean;
  addItem: (payload: AddToCartPayload) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'mkbl_cart';
const TAX_RATE = 0.20; // 20% UK VAT

// Generate unique ID for cart items (guest mode)
function generateCartItemId(): string {
  return `cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Transform server response to local CartItem format
function transformServerItem(item: CartItemResponse): CartItem {
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

// Load items from localStorage
function loadFromLocalStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
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

// Save items to localStorage
function saveToLocalStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        items,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.error('Failed to save cart to localStorage:', error);
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const lastUserIdRef = useRef<string | null>(null);
  const hasSyncedRef = useRef(false);

  // Load cart from localStorage on mount (for immediate display)
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

        let serverItems: CartItemResponse[];

        if (localItems.length > 0) {
          // Merge localStorage with server
          serverItems = await cartService.syncCart(
            localItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              customization: item.customization,
              addedAt: item.addedAt,
            }))
          );
        } else {
          // Just fetch server cart
          serverItems = await cartService.getCart();
        }

        // Transform and set items
        const mergedItems = serverItems.map(transformServerItem);
        setItems(mergedItems);
        saveToLocalStorage(mergedItems);
        hasSyncedRef.current = true;
      } catch (error) {
        console.error('Failed to sync cart with server:', error);
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

  // Calculate totals
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  // Add item to cart
  const addItem = useCallback(
    (payload: AddToCartPayload) => {
      // Optimistic update
      setItems((currentItems) => {
        // Check if same product+variant+customization already exists
        const existingIndex = currentItems.findIndex(
          (item) =>
            item.productId === payload.productId &&
            item.variantId === payload.variantId &&
            JSON.stringify(item.customization) === JSON.stringify(payload.customization)
        );

        if (existingIndex >= 0) {
          // Update quantity of existing item
          const updatedItems = [...currentItems];
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            quantity: updatedItems[existingIndex].quantity + payload.quantity,
          };
          return updatedItems;
        }

        // Add new item
        const newItem: CartItem = {
          id: generateCartItemId(),
          ...payload,
          addedAt: new Date().toISOString(),
        };
        return [...currentItems, newItem];
      });

      // If logged in, sync with server
      if (user) {
        cartService.addToCart({
          productId: payload.productId,
          variantId: payload.variantId,
          quantity: payload.quantity,
          unitPrice: payload.unitPrice,
          customization: payload.customization,
        }).catch((error) => {
          console.error('Failed to add item to server cart:', error);
          // Note: We don't revert optimistic update for cart (unlike wishlist)
          // Cart items are more critical for checkout flow
        });
      }
    },
    [user]
  );

  // Remove item from cart by itemId
  const removeItem = useCallback(
    (itemId: string) => {
      // Save current state for potential revert
      const previousItems = items;

      // Optimistic update
      setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));

      // If logged in, sync with server
      if (user) {
        cartService.removeFromCart(itemId).catch((error) => {
          console.error('Failed to remove item from server cart:', error);
          // Revert on error
          setItems(previousItems);
        });
      }
    },
    [user, items]
  );

  // Update item quantity
  const updateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      if (quantity < 1) {
        removeItem(itemId);
        return;
      }

      // Save current state for potential revert
      const previousItems = items;

      // Optimistic update
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === itemId ? { ...item, quantity } : item
        )
      );

      // If logged in, sync with server
      if (user) {
        cartService.updateCartItemQuantity(itemId, quantity).catch((error) => {
          console.error('Failed to update cart item on server:', error);
          // Revert on error
          setItems(previousItems);
        });
      }
    },
    [user, items, removeItem]
  );

  // Clear all items from cart
  const clearCart = useCallback(() => {
    setItems([]);

    // If logged in, clear server cart too
    if (user) {
      cartService.clearCart().catch((error) => {
        console.error('Failed to clear server cart:', error);
      });
    }
  }, [user]);

  // Open cart drawer
  const openCart = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Close cart drawer
  const closeCart = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        tax,
        total,
        isOpen,
        isSyncing,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
