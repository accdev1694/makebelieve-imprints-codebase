'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cartService, CartItemResponse } from '@/lib/api/cart';
import { TAX, CART } from '@/lib/config/constants';
import {
  CartItem,
  AddToCartPayload,
  generateCartItemId,
  transformServerItem,
  loadCartFromStorage,
  saveCartToStorage,
  loadSelectionFromStorage,
  saveSelectionToStorage,
} from '@/lib/cart';

// Re-export types for backward compatibility
export type { CartItem, AddToCartPayload } from '@/lib/cart';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  tax: number;
  total: number;
  isOpen: boolean;
  isSyncing: boolean;
  error: string | null;
  clearError: () => void;
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
  clearSelectedItems: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const lastUserIdRef = useRef<string | null>(null);
  const hasSyncedRef = useRef(false);
  const selectionInitializedRef = useRef(false);

  // Load cart from localStorage on mount (for immediate display)
  useEffect(() => {
    const localItems = loadCartFromStorage();
    setItems(localItems);
    setIsInitialized(true);

    // Load selection from localStorage
    const savedSelection = loadSelectionFromStorage();
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
        const localItems = loadCartFromStorage();

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
        saveCartToStorage(mergedItems);

        // CRITICAL FIX: Update selection to use new server IDs
        // Select all items after sync since we can't map old client IDs to new server IDs
        const newItemIds = new Set(mergedItems.map((item) => item.id));
        setSelectedItemIds(newItemIds);
        saveSelectionToStorage(newItemIds);

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

  // Save to localStorage whenever items change (after initial load, not during sync)
  useEffect(() => {
    if (isInitialized && !isSyncing) {
      saveCartToStorage(items);
    }
  }, [items, isInitialized, isSyncing]);

  // Save selection to localStorage whenever it changes (not during sync)
  useEffect(() => {
    if (selectionInitializedRef.current && !isSyncing) {
      saveSelectionToStorage(selectedItemIds);
    }
  }, [selectedItemIds, isSyncing]);

  // Calculate totals
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const tax = subtotal * TAX.VAT_RATE;
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

  const selectedTax = selectedSubtotal * TAX.VAT_RATE;
  const selectedTotal = selectedSubtotal + selectedTax;

  // Selection state helpers
  const isAllSelected = items.length > 0 && selectedItemIds.size === items.length;
  const isIndeterminate = selectedItemIds.size > 0 && selectedItemIds.size < items.length;

  // Add item to cart
  const addItem = useCallback(
    (payload: AddToCartPayload) => {
      // Check if same product+variant+customization already exists
      const existingItem = items.find(
        (item) =>
          item.productId === payload.productId &&
          item.variantId === payload.variantId &&
          JSON.stringify(item.customization) === JSON.stringify(payload.customization)
      );

      if (existingItem) {
        // Update quantity of existing item
        const updatedQuantity = existingItem.quantity + payload.quantity;
        setItems((currentItems) =>
          currentItems.map((item) =>
            item.id === existingItem.id ? { ...item, quantity: updatedQuantity } : item
          )
        );
        // Ensure existing item stays selected (moved outside setState)
        setSelectedItemIds((prev) => new Set([...prev, existingItem.id]));

        // If logged in, sync with server
        if (user) {
          cartService.addToCart({
            productId: payload.productId,
            variantId: payload.variantId,
            quantity: payload.quantity,
            unitPrice: payload.unitPrice,
            customization: payload.customization,
          }).catch((err) => {
            console.error('Failed to add item to server cart:', err);
            setError('Failed to sync cart with server. Your changes are saved locally.');
          });
        }
        return;
      }

      // Add new item with temporary client ID
      const tempId = generateCartItemId();
      const newItem: CartItem = {
        id: tempId,
        ...payload,
        addedAt: new Date().toISOString(),
      };

      // Optimistic update
      setItems((currentItems) => [...currentItems, newItem]);
      setSelectedItemIds((prev) => new Set([...prev, tempId]));

      // If logged in, sync with server and reconcile ID
      if (user) {
        cartService.addToCart({
          productId: payload.productId,
          variantId: payload.variantId,
          quantity: payload.quantity,
          unitPrice: payload.unitPrice,
          customization: payload.customization,
        }).then((serverItem) => {
          // CRITICAL FIX: Reconcile local ID with server ID
          if (serverItem && serverItem.id !== tempId) {
            setItems((currentItems) =>
              currentItems.map((item) =>
                item.id === tempId ? { ...item, id: serverItem.id } : item
              )
            );
            // Update selection with new server ID
            setSelectedItemIds((prev) => {
              const next = new Set(prev);
              next.delete(tempId);
              next.add(serverItem.id);
              return next;
            });
          }
        }).catch((err) => {
          console.error('Failed to add item to server cart:', err);
          setError('Failed to sync cart with server. Your changes are saved locally.');
        });
      }
    },
    [user, items]
  );

  // Remove item from cart by itemId
  const removeItem = useCallback(
    (itemId: string) => {
      // Capture previous state inside updater to avoid stale closure
      let previousItems: CartItem[] = [];
      let previousSelection: Set<string> = new Set();

      // Optimistic update - remove from cart and selection
      setItems((currentItems) => {
        previousItems = currentItems; // Capture for potential revert
        return currentItems.filter((item) => item.id !== itemId);
      });
      setSelectedItemIds((prev) => {
        previousSelection = prev; // Capture for potential revert
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });

      // If logged in, sync with server
      if (user) {
        cartService.removeFromCart(itemId).catch((err) => {
          console.error('Failed to remove item from server cart:', err);
          // Revert on error using captured state
          setItems(previousItems);
          setSelectedItemIds(previousSelection);
          setError('Failed to remove item from server. Please try again.');
        });
      }
    },
    [user]
  );

  // Update item quantity
  const updateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      if (quantity < 1) {
        removeItem(itemId);
        return;
      }

      // Enforce max quantity limit
      const clampedQuantity = Math.min(quantity, CART.MAX_QUANTITY);

      // Capture previous state inside updater to avoid stale closure
      let previousItems: CartItem[] = [];

      // Optimistic update
      setItems((currentItems) => {
        previousItems = currentItems; // Capture for potential revert
        return currentItems.map((item) =>
          item.id === itemId ? { ...item, quantity: clampedQuantity } : item
        );
      });

      // If logged in, sync with server
      if (user) {
        cartService.updateCartItemQuantity(itemId, clampedQuantity).catch((err) => {
          console.error('Failed to update cart item on server:', err);
          // Revert on error using captured state
          setItems(previousItems);
          setError('Failed to update quantity on server. Please try again.');
        });
      }
    },
    [user, removeItem]
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

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
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
  const clearSelectedItems = useCallback(async () => {
    // Capture selected IDs inside updater to avoid stale closure
    let selectedIds: string[] = [];

    // Remove selected items from cart
    setItems((currentItems) => {
      selectedIds = currentItems.filter((item) => selectedItemIds.has(item.id)).map((item) => item.id);
      return currentItems.filter((item) => !selectedItemIds.has(item.id));
    });

    // Clear selection
    setSelectedItemIds(new Set());

    // If logged in, remove items from server (await to ensure completion)
    if (user && selectedIds.length > 0) {
      try {
        await Promise.all(
          selectedIds.map((id) => cartService.removeFromCart(id))
        );
      } catch (error) {
        console.error('Failed to remove some items from server cart:', error);
        // Items already removed from local state, server will eventually sync
      }
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
        error,
        clearError,
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
