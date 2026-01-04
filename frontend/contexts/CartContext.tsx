'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
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
  // Selection state for selective checkout
  selectedItemIds: Set<string>;
  selectedItemsArray: CartItem[];
  selectedCount: number;
  selectedSubtotal: number;
  selectedTax: number;
  selectedTotal: number;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  // Selection operations
  selectItem: (itemId: string) => void;
  deselectItem: (itemId: string) => void;
  toggleItemSelection: (itemId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  clearSelectedItems: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'mkbl_cart';
const CART_SELECTION_KEY = 'mkbl_cart_selection';
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

// Load selection from localStorage
function loadSelectionFromLocalStorage(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(CART_SELECTION_KEY);
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

// Save selection to localStorage
function saveSelectionToLocalStorage(selectedIds: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_SELECTION_KEY, JSON.stringify([...selectedIds]));
  } catch (error) {
    console.error('Failed to save cart selection to localStorage:', error);
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const lastUserIdRef = useRef<string | null>(null);
  const hasSyncedRef = useRef(false);
  const selectionInitializedRef = useRef(false);

  // Load cart from localStorage on mount (for immediate display)
  useEffect(() => {
    const localItems = loadFromLocalStorage();
    setItems(localItems);
    setIsInitialized(true);

    // Load selection from localStorage
    const savedSelection = loadSelectionFromLocalStorage();
    // Only keep selection for items that exist in cart
    const validSelection = new Set(
      [...savedSelection].filter((id) => localItems.some((item) => item.id === id))
    );
    // If no saved selection, select all items by default
    if (validSelection.size === 0 && localItems.length > 0) {
      setSelectedItemIds(new Set(localItems.map((item) => item.id)));
    } else {
      setSelectedItemIds(validSelection);
    }
    selectionInitializedRef.current = true;
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

  // Save selection to localStorage whenever it changes
  useEffect(() => {
    if (selectionInitializedRef.current) {
      saveSelectionToLocalStorage(selectedItemIds);
    }
  }, [selectedItemIds]);

  // Calculate totals
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  // Calculate selected items and their totals
  const selectedItemsArray = useMemo(
    () => items.filter((item) => selectedItemIds.has(item.id)),
    [items, selectedItemIds]
  );

  const selectedCount = useMemo(
    () => selectedItemsArray.reduce((sum, item) => sum + item.quantity, 0),
    [selectedItemsArray]
  );

  const selectedSubtotal = useMemo(
    () => selectedItemsArray.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [selectedItemsArray]
  );

  const selectedTax = selectedSubtotal * TAX_RATE;
  const selectedTotal = selectedSubtotal + selectedTax;

  // Selection state helpers
  const isAllSelected = items.length > 0 && selectedItemIds.size === items.length;
  const isIndeterminate = selectedItemIds.size > 0 && selectedItemIds.size < items.length;

  // Add item to cart
  const addItem = useCallback(
    (payload: AddToCartPayload) => {
      let newItemId: string | null = null;

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
          // Update quantity of existing item - ensure it stays selected
          const existingId = currentItems[existingIndex].id;
          setSelectedItemIds((prev) => new Set([...prev, existingId]));
          const updatedItems = [...currentItems];
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            quantity: updatedItems[existingIndex].quantity + payload.quantity,
          };
          return updatedItems;
        }

        // Add new item
        newItemId = generateCartItemId();
        const newItem: CartItem = {
          id: newItemId,
          ...payload,
          addedAt: new Date().toISOString(),
        };
        return [...currentItems, newItem];
      });

      // Auto-select new items
      if (newItemId) {
        setSelectedItemIds((prev) => new Set([...prev, newItemId!]));
      }

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
      const previousSelection = selectedItemIds;

      // Optimistic update - remove from cart and selection
      setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
      setSelectedItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });

      // If logged in, sync with server
      if (user) {
        cartService.removeFromCart(itemId).catch((error) => {
          console.error('Failed to remove item from server cart:', error);
          // Revert on error
          setItems(previousItems);
          setSelectedItemIds(previousSelection);
        });
      }
    },
    [user, items, selectedItemIds]
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
    setSelectedItemIds(new Set());

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

  // Selection operations
  const selectItem = useCallback((itemId: string) => {
    setSelectedItemIds((prev) => new Set([...prev, itemId]));
  }, []);

  const deselectItem = useCallback((itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  }, []);

  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedItemIds(new Set(items.map((item) => item.id)));
  }, [items]);

  const deselectAll = useCallback(() => {
    setSelectedItemIds(new Set());
  }, []);

  // Clear only selected items from cart (for post-checkout)
  const clearSelectedItems = useCallback(() => {
    const selectedIds = [...selectedItemIds];

    // Remove selected items from cart
    setItems((currentItems) => currentItems.filter((item) => !selectedItemIds.has(item.id)));

    // Clear selection
    setSelectedItemIds(new Set());

    // If logged in, remove items from server
    if (user) {
      Promise.all(
        selectedIds.map((id) => cartService.removeFromCart(id).catch((error) => {
          console.error('Failed to remove item from server cart:', error);
        }))
      );
    }
  }, [selectedItemIds, user]);

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
        // Selection state
        selectedItemIds,
        selectedItemsArray,
        selectedCount,
        selectedSubtotal,
        selectedTax,
        selectedTotal,
        isAllSelected,
        isIndeterminate,
        // Selection operations
        selectItem,
        deselectItem,
        toggleItemSelection,
        selectAll,
        deselectAll,
        clearSelectedItems,
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
