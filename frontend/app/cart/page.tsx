'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CartItem } from '@/components/cart/CartItem';
import { CartSummary } from '@/components/cart/CartSummary';
import { Separator } from '@/components/ui/separator';

export default function CartPage() {
  const { items, clearCart, itemCount } = useCart();

  // Set page title
  useEffect(() => {
    document.title = 'Shopping Cart | MakeBelieve Imprints';
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/products">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Shopping Cart</h1>
              <p className="text-gray-500 text-sm">
                {itemCount === 0
                  ? 'Your cart is empty'
                  : `${itemCount} ${itemCount === 1 ? 'item' : 'items'} in your cart`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {items.length === 0 ? (
          /* Empty Cart State */
          <div className="max-w-md mx-auto text-center py-16">
            <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="h-12 w-12 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-8">
              Discover our amazing products and add something special to your cart!
            </p>
            <div className="space-y-3">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/products">Browse Products</Link>
              </Button>
              <div className="text-sm text-gray-500">or</div>
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
                  <CardTitle>Cart Items</CardTitle>
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
                  <div className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <CartItem key={item.id} item={item} />
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
                  <CartSummary />

                  <Separator />

                  {/* Promo Code (placeholder for future) */}
                  <div className="text-sm text-gray-500">
                    Have a promo code? Enter it at checkout.
                  </div>

                  {/* Checkout Button */}
                  <Button asChild size="lg" className="w-full">
                    <Link href="/checkout">Proceed to Checkout</Link>
                  </Button>

                  {/* Security Note */}
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
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
                  <ul className="text-xs text-gray-500 space-y-1">
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
