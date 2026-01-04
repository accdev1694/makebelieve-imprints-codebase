'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import { cn } from '@/lib/utils';

export function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    itemCount,
    selectedItemIds,
    selectedCount,
    isAllSelected,
    isIndeterminate,
    selectItem,
    deselectItem,
    selectAll,
    deselectAll,
  } = useCart();

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open: boolean) => !open && closeCart()}>
      <DialogPrimitive.Portal>
        {/* Overlay */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 dark:bg-black/50 bg-black/40 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />

        {/* Drawer Content */}
        <DialogPrimitive.Content
          className={cn(
            'fixed right-0 top-0 z-50 h-full w-full max-w-md',
            'bg-background shadow-xl',
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
                  <span className="text-sm font-normal text-muted-foreground">
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

            {/* Select All (only show when there are items) */}
            {items.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
                <Checkbox
                  checked={isAllSelected ? true : isIndeterminate ? 'indeterminate' : false}
                  onCheckedChange={(checked: boolean | 'indeterminate') => (checked === true ? selectAll() : deselectAll())}
                  className="h-4 w-4"
                />
                <span className="text-sm text-muted-foreground">
                  {selectedItemIds.size} of {items.length} selected
                </span>
              </div>
            )}

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ShoppingBag className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Your cart is empty
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-[200px]">
                    Looks like you haven&apos;t added any items yet.
                  </p>
                  <Button asChild onClick={closeCart}>
                    <Link href="/products">Browse Products</Link>
                  </Button>
                </div>
              ) : (
                <div className="py-2">
                  {items.map((item) => (
                    <CartItem
                      key={item.id}
                      item={item}
                      compact
                      showCheckbox={true}
                      isSelected={selectedItemIds.has(item.id)}
                      onSelectionChange={(id, selected) =>
                        selected ? selectItem(id) : deselectItem(id)
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer with Summary and Actions */}
            {items.length > 0 && (
              <div className="border-t px-4 py-4 space-y-4">
                <CartSummary showDetails={false} />

                <div className="space-y-2">
                  <Button
                    asChild={selectedCount > 0}
                    className="w-full"
                    size="lg"
                    onClick={selectedCount > 0 ? closeCart : undefined}
                    disabled={selectedCount === 0}
                  >
                    {selectedCount > 0 ? (
                      <Link href="/checkout">
                        Checkout ({selectedCount} {selectedCount === 1 ? 'item' : 'items'})
                      </Link>
                    ) : (
                      <span>Select items to checkout</span>
                    )}
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

                <p className="text-xs text-muted-foreground text-center">
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
