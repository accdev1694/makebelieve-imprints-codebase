'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag, Trash2, AlertCircle, X } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CartItem } from '@/components/cart/CartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { Separator } from '@/components/ui/separator';

export default function CartPage() {
  const {
    items,
    clearCart,
    itemCount,
    selectedItemIds,
    selectedCount,
    isAllSelected,
    isIndeterminate,
    selectItem,
    deselectItem,
    selectAll,
    deselectAll,
    error,
    clearError,
  } = useCart();

  // Set page title
  useEffect(() => {
    document.title = 'Shopping Cart | MakeBelieve Imprints';
  }, []);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/products">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Shopping Cart</h1>
              <p className="text-muted-foreground text-sm">
                {itemCount === 0
                  ? 'Your cart is empty'
                  : `${itemCount} ${itemCount === 1 ? 'item' : 'items'} in your cart`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="container mx-auto px-4 pt-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 -mr-2"
                onClick={clearError}
              >
                <X className="h-3 w-3" />
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {items.length === 0 ? (
          /* Empty Cart State */
          <div className="max-w-md mx-auto text-center py-16">
            <div className="bg-muted rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-8">
              Discover our amazing products and add something special to your cart!
            </p>
            <div className="space-y-3">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/products">Browse Products</Link>
              </Button>
              <div className="text-sm text-muted-foreground">or</div>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link href="/templates">Explore Templates</Link>
              </Button>
            </div>
          </div>
        ) : (
          /* Cart with Items */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isAllSelected ? true : isIndeterminate ? 'indeterminate' : false}
                      onCheckedChange={(checked: boolean | 'indeterminate') => (checked === true ? selectAll() : deselectAll())}
                    />
                    <div>
                      <CardTitle>Cart Items</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedItemIds.size} of {items.length} items selected
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={clearCart}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Cart
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border">
                    {items.map((item) => (
                      <CartItem
                        key={item.id}
                        item={item}
                        showCheckbox={true}
                        isSelected={selectedItemIds.has(item.id)}
                        onSelectionChange={(id, selected) =>
                          selected ? selectItem(id) : deselectItem(id)
                        }
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Continue Shopping */}
              <div className="mt-6">
                <Button variant="outline" asChild>
                  <Link href="/products">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Continue Shopping
                  </Link>
                </Button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <CartSummary showDetails={true} useSelectedItems={true} />

                  <Separator />

                  {/* Promo Code (placeholder for future) */}
                  <div className="text-sm text-muted-foreground">
                    Have a promo code? Enter it at checkout.
                  </div>

                  {/* Checkout Button */}
                  <Button
                    asChild={selectedCount > 0}
                    size="lg"
                    className="w-full"
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

                  {/* Security Note */}
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    Secure checkout
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Info */}
              <Card className="mt-4">
                <CardContent className="py-4">
                  <h4 className="font-medium text-sm mb-2">Shipping Information</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>Free shipping on orders over 50</li>
                    <li>Standard delivery: 3-5 business days</li>
                    <li>Express delivery available at checkout</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
