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
  deepEqual,
} from '@/lib/cart';

// Debounce delay for quantity updates (ms)
const QUANTITY_UPDATE_DEBOUNCE = 400;

// Pending update tracking for flush before checkout
interface PendingUpdate {
  itemId: string;
  quantity: number;
  timer: NodeJS.Timeout;
}

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
  // Loading state for individual items
  operatingItemIds: Set<string>;
  // Pending sync state - true if there are unsaved quantity changes
  hasPendingUpdates: boolean;
  // Flush all pending updates to server - call before checkout
  flushPendingUpdates: () => Promise<void>;
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
  const [operatingItemIds, setOperatingItemIds] = useState<Set<string>>(new Set());
  const lastUserIdRef = useRef<string | null>(null);
  const hasSyncedRef = useRef(false);
  const selectionInitializedRef = useRef(false);
  // Pending updates map - tracks itemId -> {quantity, timer} for debounced server sync
  const pendingUpdates = useRef<Map<string, PendingUpdate>>(new Map());
  // State to trigger re-render when pending updates change
  const [hasPendingUpdates, setHasPendingUpdates] = useState(false);

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

  // Cleanup debounce timers on unmount
  useEffect(() => {
    const pending = pendingUpdates.current;
    return () => {
      pending.forEach((update) => clearTimeout(update.timer));
      pending.clear();
    };
  }, []);

  // Sync pending updates before browser close/navigate away
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable sync on page unload
      const pending = pendingUpdates.current;
      if (pending.size > 0 && user) {
        pending.forEach((update) => {
          // sendBeacon is fire-and-forget, works during unload
          navigator.sendBeacon(
            `/api/cart/${update.itemId}`,
            JSON.stringify({ quantity: update.quantity })
          );
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  // Calculate totals (memoized to prevent recalculation on every render)
  const { itemCount, subtotal, tax, total } = useMemo(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const sub = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const taxAmount = sub * TAX.VAT_RATE;
    return {
      itemCount: count,
      subtotal: sub,
      tax: taxAmount,
      total: sub + taxAmount,
    };
  }, [items]);

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

  const selectedTax = useMemo(() => selectedSubtotal * TAX.VAT_RATE, [selectedSubtotal]);
  const selectedTotal = useMemo(() => selectedSubtotal + selectedTax, [selectedSubtotal, selectedTax]);

  // Selection state helpers (memoized)
  const isAllSelected = useMemo(
    () => items.length > 0 && selectedItemIds.size === items.length,
    [items.length, selectedItemIds.size]
  );
  const isIndeterminate = useMemo(
    () => selectedItemIds.size > 0 && selectedItemIds.size < items.length,
    [selectedItemIds.size, items.length]
  );

  // Add item to cart
  const addItem = useCallback(
    (payload: AddToCartPayload) => {
      // Check if same product+variant+customization already exists
      const existingItem = items.find(
        (item) =>
          item.productId === payload.productId &&
          item.variantId === payload.variantId &&
          deepEqual(item.customization, payload.customization)
      );

      if (existingItem) {
        // Prevent concurrent operations on this item
        if (operatingItemIds.has(existingItem.id)) {
          return; // Skip if already operating on this item
        }

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
          // Mark as operating to prevent race conditions
          setOperatingItemIds((prev) => new Set([...prev, existingItem.id]));

          cartService.addToCart({
            productId: payload.productId,
            variantId: payload.variantId,
            quantity: payload.quantity,
            unitPrice: payload.unitPrice,
            customization: payload.customization,
          })
            .then(() => {
              // Clear operating state on success
              setOperatingItemIds((prev) => {
                const next = new Set(prev);
                next.delete(existingItem.id);
                return next;
              });
            })
            .catch((err) => {
              console.error('Failed to add item to server cart:', err);
              setError('Failed to sync cart with server. Your changes are saved locally.');
              // Clear operating state on error
              setOperatingItemIds((prev) => {
                const next = new Set(prev);
                next.delete(existingItem.id);
                return next;
              });
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

      // Optimistic update - mark as operating immediately to prevent race conditions
      setItems((currentItems) => [...currentItems, newItem]);
      setSelectedItemIds((prev) => new Set([...prev, tempId]));

      // If logged in, sync with server and reconcile ID
      if (user) {
        // Mark temp ID as operating - blocks +/- until server responds with real ID
        setOperatingItemIds((prev) => new Set([...prev, tempId]));

        cartService.addToCart({
          productId: payload.productId,
          variantId: payload.variantId,
          quantity: payload.quantity,
          unitPrice: payload.unitPrice,
          customization: payload.customization,
        })
          .then((serverItem) => {
            // Reconcile local ID with server ID
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
              // Clear operating state with new server ID (not temp ID)
              setOperatingItemIds((prev) => {
                const next = new Set(prev);
                next.delete(tempId);
                // Don't add serverItem.id - reconciliation is complete, item is ready
                return next;
              });
            } else {
              // Same ID or no server item - just clear operating state
              setOperatingItemIds((prev) => {
                const next = new Set(prev);
                next.delete(tempId);
                return next;
              });
            }
          })
          .catch((err) => {
            console.error('Failed to add item to server cart:', err);
            setError('Failed to sync cart with server. Your changes are saved locally.');
            // Clear operating state on error - allow local-only operations
            setOperatingItemIds((prev) => {
              const next = new Set(prev);
              next.delete(tempId);
              return next;
            });
          });
      }
    },
    [user, items, operatingItemIds]
  );

  // Remove item from cart by itemId
  const removeItem = useCallback(
    (itemId: string) => {
      // Prevent concurrent operations on this item (e.g., during ID reconciliation)
      if (operatingItemIds.has(itemId)) {
        return;
      }

      // Capture previous state inside updater to avoid stale closure
      let previousItems: CartItem[] = [];
      let previousSelection: Set<string> = new Set();

      // Set item as operating
      setOperatingItemIds((prev) => new Set([...prev, itemId]));

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

      // Clear operating state (item is removed)
      setOperatingItemIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });

      // If logged in, sync with server
      if (user) {
        cartService.removeFromCart(itemId).catch(async (err) => {
          console.error('Failed to remove item from server cart:', err);

          // Check if item not found - means ID mismatch, need to re-sync
          const isNotFound = err?.message?.toLowerCase().includes('not found') ||
            err?.statusCode === 404 ||
            err?.data?.error?.toLowerCase().includes('not found');

          if (isNotFound) {
            try {
              // Re-fetch cart from server to sync IDs
              const serverItems = await cartService.getCart();
              const syncedItems = serverItems.map(transformServerItem);
              setItems(syncedItems);
              saveCartToStorage(syncedItems);
              // Update selection to match synced items
              const newItemIds = new Set(syncedItems.map((item) => item.id));
              setSelectedItemIds(newItemIds);
              saveSelectionToStorage(newItemIds);
              setError('Cart synced with server. Please try again.');
            } catch {
              setItems(previousItems);
              setSelectedItemIds(previousSelection);
              setError('Failed to sync cart. Please refresh the page.');
            }
          } else {
            // Revert on other errors
            setItems(previousItems);
            setSelectedItemIds(previousSelection);
            setError('Failed to remove item. Please try again.');
          }
        });
      }
    },
    [user, operatingItemIds]
  );

  // Sync a single pending update to server
  const syncItemToServer = useCallback(
    async (itemId: string, quantity: number): Promise<boolean> => {
      try {
        await cartService.updateCartItemQuantity(itemId, quantity);
        return true;
      } catch (err) {
        console.error('Failed to update cart item on server:', err);

        // Check if item not found - means ID mismatch, need to re-sync
        const error = err as { message?: string; statusCode?: number; data?: { error?: string } };
        const isNotFound = error?.message?.toLowerCase().includes('not found') ||
          error?.statusCode === 404 ||
          error?.data?.error?.toLowerCase().includes('not found');

        if (isNotFound) {
          try {
            // Re-fetch cart from server to sync IDs
            const serverItems = await cartService.getCart();
            const syncedItems = serverItems.map(transformServerItem);
            setItems(syncedItems);
            saveCartToStorage(syncedItems);
            // Update selection to match synced items
            const newItemIds = new Set(syncedItems.map((item) => item.id));
            setSelectedItemIds(newItemIds);
            saveSelectionToStorage(newItemIds);
            setError('Cart synced with server. Please try again.');
          } catch {
            setError('Failed to sync cart. Please refresh the page.');
          }
        } else {
          setError('Failed to update quantity. Please try again.');
        }
        return false;
      }
    },
    []
  );

  // Flush all pending updates to server - must be called before checkout
  const flushPendingUpdates = useCallback(async (): Promise<void> => {
    const pending = pendingUpdates.current;
    if (pending.size === 0) return;

    // Cancel all timers since we're syncing immediately
    const updates = Array.from(pending.values());
    updates.forEach((update) => clearTimeout(update.timer));
    pending.clear();
    setHasPendingUpdates(false);

    // Sync all pending updates in parallel
    await Promise.all(
      updates.map((update) => syncItemToServer(update.itemId, update.quantity))
    );
  }, [syncItemToServer]);

  // Update item quantity with debounced server sync for fast UI response
  const updateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      if (quantity < 1) {
        removeItem(itemId);
        return;
      }

      // Block only during ID reconciliation (new items being added), not during quantity updates
      if (operatingItemIds.has(itemId)) {
        return;
      }

      // Enforce max quantity limit
      const clampedQuantity = Math.min(quantity, CART.MAX_QUANTITY);

      // Optimistic update - UI updates instantly, no blocking
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === itemId ? { ...item, quantity: clampedQuantity } : item
        )
      );

      // If logged in, debounce the server sync
      if (user) {
        // Clear any existing debounce timer for this item
        const existingUpdate = pendingUpdates.current.get(itemId);
        if (existingUpdate) {
          clearTimeout(existingUpdate.timer);
        }

        // Set new debounce timer - only sync after user stops clicking
        const timer = setTimeout(async () => {
          pendingUpdates.current.delete(itemId);
          setHasPendingUpdates(pendingUpdates.current.size > 0);
          await syncItemToServer(itemId, clampedQuantity);
        }, QUANTITY_UPDATE_DEBOUNCE);

        // Track this pending update
        pendingUpdates.current.set(itemId, {
          itemId,
          quantity: clampedQuantity,
          timer,
        });
        setHasPendingUpdates(true);
      }
      // Guest users: no server call needed, localStorage sync happens via useEffect
    },
    [user, removeItem, operatingItemIds, syncItemToServer]
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
        // Loading state
        operatingItemIds,
        // Pending sync state
        hasPendingUpdates,
        flushPendingUpdates,
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
