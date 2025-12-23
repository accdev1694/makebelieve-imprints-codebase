'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCart, CartItem } from '@/contexts/CartContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { designsService, Design, MATERIAL_LABELS, PRINT_SIZE_LABELS } from '@/lib/api/designs';
import {
  ordersService,
  calculateOrderPrice,
  getPrintDimensions,
  ShippingAddress,
} from '@/lib/api/orders';
import { formatPrice } from '@/lib/api/products';
import { ShoppingBag, CreditCard, Lock } from 'lucide-react';

type CheckoutMode = 'cart' | 'design';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { items: cartItems, subtotal, tax, total, clearCart, itemCount } = useCart();

  const designId = searchParams.get('designId');

  // Determine checkout mode
  const mode: CheckoutMode = designId ? 'design' : 'cart';

  // State
  const [design, setDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(mode === 'design');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Shipping address state
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: user?.name || '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postcode: '',
    country: 'UK',
  });

  // Load design for legacy mode
  useEffect(() => {
    if (mode !== 'design' || !designId) return;

    const loadDesign = async () => {
      try {
        const designData = await designsService.get(designId);
        setDesign(designData);
      } catch (err: any) {
        setError(err?.error || err?.message || 'Failed to load design');
      } finally {
        setLoading(false);
      }
    };

    loadDesign();
  }, [designId, mode]);

  // Calculate price for legacy design mode
  const designPrice = design ? calculateOrderPrice(design.material, design.printSize) : 0;

  // Get dimensions for legacy mode
  const dimensions = design
    ? design.printSize === 'CUSTOM' && design.customWidth && design.customHeight
      ? { width: design.customWidth, height: design.customHeight }
      : getPrintDimensions(design.printSize, design.orientation)
    : { width: 0, height: 0 };

  // Get the final total based on mode
  const finalTotal = mode === 'cart' ? total : designPrice;
  const finalSubtotal = mode === 'cart' ? subtotal : designPrice;
  const finalTax = mode === 'cart' ? tax : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (mode === 'cart' && cartItems.length === 0) {
      setError('Your cart is empty');
      return;
    }

    if (mode === 'design' && !design) {
      setError('No design selected');
      return;
    }

    if (!shippingAddress.name.trim()) {
      setError('Please enter recipient name');
      return;
    }

    if (!shippingAddress.addressLine1.trim()) {
      setError('Please enter address line 1');
      return;
    }

    if (!shippingAddress.city.trim()) {
      setError('Please enter city');
      return;
    }

    if (!shippingAddress.postcode.trim()) {
      setError('Please enter postcode');
      return;
    }

    setSubmitting(true);

    try {
      let order;

      if (mode === 'cart') {
        // Create order from cart items (mock for now)
        order = await ordersService.create({
          // For cart orders, we create a placeholder order
          // In production, this would create OrderItems for each cart item
          designId: cartItems[0]?.productId || 'cart-order',
          printSize: 'A4',
          material: 'MATTE',
          orientation: 'portrait',
          printWidth: 21,
          printHeight: 29.7,
          previewUrl: cartItems[0]?.productImage || '',
          shippingAddress,
          totalPrice: finalTotal,
          // Include cart items as metadata (mock implementation)
          // In production, backend would handle OrderItem creation
        });

        // Clear the cart after successful order
        clearCart();
      } else if (design) {
        // Legacy design-based order
        order = await ordersService.create({
          designId: design.id,
          printSize: design.printSize,
          material: design.material,
          orientation: design.orientation,
          printWidth: dimensions.width,
          printHeight: dimensions.height,
          previewUrl: design.previewUrl,
          shippingAddress,
          totalPrice: finalTotal,
        });
      }

      // Redirect to confirmation page
      router.push(`/checkout/confirmation?orderId=${order?.id}`);
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-md h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Check for empty cart in cart mode
  if (mode === 'cart' && cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Your Cart is Empty</CardTitle>
            <CardDescription>Add some items to your cart to checkout</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/products')} className="w-full">
              Browse Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state for design mode
  if (mode === 'design' && error && !design) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push('/design/my-designs')}>Back to My Designs</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={mode === 'cart' ? '/cart' : '/design/my-designs'}>
              <Button variant="ghost" size="sm">
                ← Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Checkout</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            Secure Checkout
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Shipping & Payment */}
            <div className="space-y-6">
              {/* Shipping Address */}
              <Card className="card-glow">
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                  <CardDescription>Where should we send your order?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                      Recipient Name *
                    </label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Smith"
                      value={shippingAddress.name}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                      required
                      className="bg-card/50"
                    />
                  </div>

                  <div>
                    <label htmlFor="addressLine1" className="block text-sm font-medium text-foreground mb-2">
                      Address Line 1 *
                    </label>
                    <Input
                      id="addressLine1"
                      type="text"
                      placeholder="123 Main Street"
                      value={shippingAddress.addressLine1}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, addressLine1: e.target.value })}
                      required
                      className="bg-card/50"
                    />
                  </div>

                  <div>
                    <label htmlFor="addressLine2" className="block text-sm font-medium text-foreground mb-2">
                      Address Line 2 (Optional)
                    </label>
                    <Input
                      id="addressLine2"
                      type="text"
                      placeholder="Apartment, suite, etc."
                      value={shippingAddress.addressLine2}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, addressLine2: e.target.value })}
                      className="bg-card/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-foreground mb-2">
                        City *
                      </label>
                      <Input
                        id="city"
                        type="text"
                        placeholder="London"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                        required
                        className="bg-card/50"
                      />
                    </div>

                    <div>
                      <label htmlFor="postcode" className="block text-sm font-medium text-foreground mb-2">
                        Postcode *
                      </label>
                      <Input
                        id="postcode"
                        type="text"
                        placeholder="SW1A 1AA"
                        value={shippingAddress.postcode}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, postcode: e.target.value })}
                        required
                        className="bg-card/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-foreground mb-2">
                      Country *
                    </label>
                    <Input
                      id="country"
                      type="text"
                      value={shippingAddress.country}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                      required
                      className="bg-card/50"
                      disabled
                    />
                    <p className="text-xs text-muted-foreground mt-1">Currently shipping to UK only</p>
                  </div>
                </CardContent>
              </Card>

              {/* Mock Payment Section */}
              <Card className="card-glow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment
                  </CardTitle>
                  <CardDescription>Secure payment processing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label htmlFor="cardNumber" className="block text-sm font-medium text-foreground mb-2">
                      Card Number
                    </label>
                    <Input
                      id="cardNumber"
                      type="text"
                      placeholder="4242 4242 4242 4242"
                      className="bg-card/50"
                      disabled
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="expiry" className="block text-sm font-medium text-foreground mb-2">
                        Expiry Date
                      </label>
                      <Input id="expiry" type="text" placeholder="MM/YY" className="bg-card/50" disabled />
                    </div>
                    <div>
                      <label htmlFor="cvc" className="block text-sm font-medium text-foreground mb-2">
                        CVC
                      </label>
                      <Input id="cvc" type="text" placeholder="123" className="bg-card/50" disabled />
                    </div>
                  </div>
                  <div className="bg-primary/10 text-primary p-3 rounded-lg text-sm">
                    Payment integration coming soon. Orders are currently processed as test orders.
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Order Summary */}
            <div className="space-y-6">
              <Card className="card-glow">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                  <CardDescription>
                    {mode === 'cart' ? `${itemCount} item${itemCount !== 1 ? 's' : ''} in your order` : 'Review your order details'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cart Items */}
                  {mode === 'cart' && (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
                          <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                            <Image
                              src={item.productImage || '/placeholder-product.png'}
                              alt={item.productName}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-1">{item.productName}</p>
                            {(item.size || item.color || item.material) && (
                              <p className="text-xs text-muted-foreground">
                                {[item.size, item.color, item.material].filter(Boolean).join(' / ')}
                              </p>
                            )}
                            <div className="flex justify-between mt-1">
                              <span className="text-xs text-muted-foreground">Qty: {item.quantity}</span>
                              <span className="text-sm font-medium">{formatPrice(item.unitPrice * item.quantity)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Design Order (Legacy) */}
                  {mode === 'design' && design && (
                    <>
                      <div className="aspect-square w-full bg-card/30 rounded-lg overflow-hidden flex items-center justify-center">
                        <img
                          src={design.previewUrl || design.imageUrl}
                          alt={design.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>

                      <div>
                        <h3 className="font-semibold text-lg">{design.name}</h3>
                        {design.description && (
                          <p className="text-sm text-muted-foreground">{design.description}</p>
                        )}
                      </div>

                      <Separator />

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Material:</span>
                          <span className="font-medium">{MATERIAL_LABELS[design.material]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Size:</span>
                          <span className="font-medium">{PRINT_SIZE_LABELS[design.printSize]}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dimensions:</span>
                          <span className="font-medium">
                            {dimensions.width} x {dimensions.height} cm
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Price Breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>{formatPrice(finalSubtotal)}</span>
                    </div>
                    {mode === 'cart' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">VAT (20%):</span>
                        <span>{formatPrice(finalTax)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping:</span>
                      <span className="text-green-500">FREE</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-primary">{formatPrice(finalTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Place Order Button */}
              <Button type="submit" className="w-full btn-gradient text-lg py-6" disabled={submitting}>
                {submitting ? 'Processing...' : `Place Order - ${formatPrice(finalTotal)}`}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By placing this order, you agree to our terms and conditions. Your order will be processed and shipped
                within 3-5 business days.
              </p>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <CheckoutContent />
    </ProtectedRoute>
  );
}
