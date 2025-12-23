'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

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

// Generate unique ID for cart items
function generateCartItemId(): string {
  return `cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.items && Array.isArray(parsed.items)) {
          setItems(parsed.items);
        }
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error);
    }
    setIsInitialized(true);
  }, []);

  // Save cart to localStorage whenever items change (after initial load)
  useEffect(() => {
    if (isInitialized) {
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
  }, [items, isInitialized]);

  // Calculate totals
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  // Add item to cart
  const addItem = useCallback((payload: AddToCartPayload) => {
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
  }, []);

  // Remove item from cart
  const removeItem = useCallback((itemId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  }, []);

  // Update item quantity
  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(itemId);
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  }, [removeItem]);

  // Clear all items from cart
  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

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
