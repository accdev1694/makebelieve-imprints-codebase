'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import { cn } from '@/lib/utils';

export function CartDrawer() {
  const { items, isOpen, closeCart, itemCount } = useCart();

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open: boolean) => !open && closeCart()}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />

        {/* Drawer Content */}
        <DialogPrimitive.Content
          className={cn(
            'fixed right-0 top-0 z-50 h-full w-full max-w-md',
            'bg-white shadow-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
            'duration-300'
          )}
        >
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-4">
              <DialogPrimitive.Title className="text-lg font-semibold flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Shopping Cart
                {itemCount > 0 && (
                  <span className="text-sm font-normal text-gray-500">
                    ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                  </span>
                )}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close cart</span>
                </Button>
              </DialogPrimitive.Close>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ShoppingBag className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Your cart is empty
                  </h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-[200px]">
                    Looks like you haven&apos;t added any items yet.
                  </p>
                  <Button asChild onClick={closeCart}>
                    <Link href="/products">Browse Products</Link>
                  </Button>
                </div>
              ) : (
                <div className="py-2">
                  {items.map((item) => (
                    <CartItem key={item.id} item={item} compact />
                  ))}
                </div>
              )}
            </div>

            {/* Footer with Summary and Actions */}
            {items.length > 0 && (
              <div className="border-t px-4 py-4 space-y-4">
                <CartSummary showDetails={false} />

                <div className="space-y-2">
                  <Button asChild className="w-full" size="lg" onClick={closeCart}>
                    <Link href="/checkout">Proceed to Checkout</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full"
                    onClick={closeCart}
                  >
                    <Link href="/cart">View Full Cart</Link>
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  Shipping and taxes calculated at checkout
                </p>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
