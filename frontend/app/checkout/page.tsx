'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { designsService, Design } from '@/lib/api/designs';
import {
  ordersService,
  calculateOrderPrice,
  getPrintDimensions,
  ShippingAddress,
} from '@/lib/api/orders';
import { Product, productsService, formatPrice } from '@/lib/api/products';
import { ShoppingBag, Lock } from 'lucide-react';
import { redirectToCheckout } from '@/lib/stripe';

import {
  CheckoutMode,
  ShippingMethod,
  SHIPPING_OPTIONS,
  FREE_SHIPPING_THRESHOLD,
} from './constants';

import {
  ContactInfoSection,
  ShippingAddressSection,
  ShippingMethodSection,
  PaymentSection,
  OrderSummarySection,
  SuggestedProductsSection,
} from './components';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    selectedItemsArray: cartItems,
    selectedSubtotal: subtotal,
    selectedTax: tax,
    selectedTotal: _total,
    selectedCount: itemCount,
    selectedItemIds,
    addItem,
    clearSelectedItems: _clearSelectedItems,
  } = useCart();

  const designId = searchParams.get('designId');

  // Determine checkout mode
  const mode: CheckoutMode = designId ? 'design' : 'cart';

  // State
  const [design, setDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(mode === 'design');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Contact information state
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');

  // Shipping address state
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: user?.name || '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postcode: '',
    country: 'United Kingdom',
  });

  // Shipping method state
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('standard');

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoValidating, setPromoValidating] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    name: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    discountAmount: number;
  } | null>(null);
  const [promoError, setPromoError] = useState('');

  // Loyalty points state
  const [userPoints, setUserPoints] = useState(0);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [usePoints, setUsePoints] = useState(false);

  // Suggested products state
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([]);

  // Load suggested products
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const cartProductIds = cartItems.map(item => item.productId);
        const { products } = await productsService.list({
          featured: true,
          limit: 8,
          status: 'ACTIVE',
        });
        const filtered = products.filter(p => !cartProductIds.includes(p.id));
        setSuggestedProducts(filtered.slice(0, 4));
      } catch {
        // Silently fail - suggestions are not critical
      }
    };

    if (mode === 'cart') {
      loadSuggestions();
    }
  }, [cartItems, mode]);

  // Load user's loyalty points
  useEffect(() => {
    const loadPoints = async () => {
      try {
        const response = await fetch('/api/users/points');
        const data = await response.json();
        if (data.success && data.data) {
          setUserPoints(data.data.points || 0);
        }
      } catch {
        // Silent fail - points feature is not critical
      }
    };
    loadPoints();
  }, []);

  // Load design for legacy mode
  useEffect(() => {
    if (mode !== 'design' || !designId) return;

    const loadDesign = async () => {
      try {
        const designData = await designsService.get(designId);
        setDesign(designData);
      } catch (err: unknown) {
        const error = err as { error?: string; message?: string };
        setError(error?.error || error?.message || 'Failed to load design');
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

  // Get shipping cost
  const selectedShipping = SHIPPING_OPTIONS.find((opt) => opt.id === shippingMethod);
  const shippingCost = selectedShipping?.price || 0;
  const qualifiesForFreeShipping = (mode === 'cart' ? subtotal : designPrice) >= FREE_SHIPPING_THRESHOLD;
  const actualShippingCost = qualifiesForFreeShipping && shippingMethod === 'standard' ? 0 : shippingCost;

  // Get the final total based on mode
  const finalSubtotal = mode === 'cart' ? subtotal : designPrice;
  const finalTax = mode === 'cart' ? tax : 0;
  const discountAmount = appliedPromo?.discountAmount || 0;
  const pointsDiscount = usePoints ? pointsToUse / 100 : 0; // 100 points = £1
  const finalTotal = Math.max(0, finalSubtotal + finalTax + actualShippingCost - discountAmount - pointsDiscount);

  // Calculate max redeemable points
  const maxRedeemableAmount = Math.max(0, finalSubtotal + finalTax + actualShippingCost - discountAmount);
  const maxRedeemablePoints = Math.min(userPoints, Math.floor(maxRedeemableAmount * 100));

  // Validate promo code
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;

    setPromoValidating(true);
    setPromoError('');

    try {
      const response = await fetch('/api/promos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode,
          email,
          cartItems: mode === 'cart' ? cartItems.map(item => ({
            productId: item.productId,
            price: item.unitPrice,
            quantity: item.quantity,
          })) : [],
          cartTotal: finalSubtotal + finalTax,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        setPromoError(data.error || 'Invalid promo code');
        return;
      }

      setAppliedPromo({
        code: data.code,
        name: data.name,
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountAmount: data.discountAmount,
      });
      setPromoCode('');
    } catch {
      setPromoError('Failed to validate promo code');
    } finally {
      setPromoValidating(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError('');
  };

  const handleUsePointsChange = (checked: boolean) => {
    setUsePoints(checked);
    if (checked) {
      setPointsToUse(Math.min(maxRedeemablePoints, userPoints));
    } else {
      setPointsToUse(0);
    }
  };

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

    if (!email.trim()) {
      setError('Please enter email address');
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'cart') {
        // Create cart-based order
        const response = await fetch('/api/checkout/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cartItemIds: [...selectedItemIds],
            shippingAddress,
            shippingMethod,
            email,
            phone: phone || undefined,
            promoCode: appliedPromo?.code,
            pointsToRedeem: usePoints ? pointsToUse : 0,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create checkout session');
        }

        // Redirect to Stripe Checkout
        await redirectToCheckout(data.sessionId);
      } else if (design) {
        // Legacy design-based order
        const order = await ordersService.create({
          designId: design.id,
          email,
          phone: phone || undefined,
          shippingAddress,
          shippingMethod,
        });

        router.push(`/orders/${order.id}?success=true`);
      }
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setError(error?.error || error?.message || 'Failed to process checkout');
      setSubmitting(false);
    }
  };

  // Loading state for design mode
  if (mode === 'design' && loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your design...</p>
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
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
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

        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Shipping & Payment */}
            <div className="space-y-6">
              <ContactInfoSection
                email={email}
                phone={phone}
                onEmailChange={setEmail}
                onPhoneChange={setPhone}
              />

              <ShippingAddressSection
                shippingAddress={shippingAddress}
                onAddressChange={setShippingAddress}
              />

              <ShippingMethodSection
                shippingMethod={shippingMethod}
                onMethodChange={setShippingMethod}
                qualifiesForFreeShipping={qualifiesForFreeShipping}
              />

              <PaymentSection />
            </div>

            {/* Right Column - Order Summary */}
            <div className="space-y-6">
              <OrderSummarySection
                mode={mode}
                cartItems={cartItems}
                itemCount={itemCount}
                design={design}
                dimensions={dimensions}
                finalSubtotal={finalSubtotal}
                finalTax={finalTax}
                actualShippingCost={actualShippingCost}
                selectedShipping={selectedShipping}
                finalTotal={finalTotal}
                promoCode={promoCode}
                promoValidating={promoValidating}
                promoError={promoError}
                appliedPromo={appliedPromo}
                onPromoCodeChange={setPromoCode}
                onApplyPromo={handleApplyPromo}
                onRemovePromo={handleRemovePromo}
                userPoints={userPoints}
                usePoints={usePoints}
                pointsToUse={pointsToUse}
                maxRedeemablePoints={maxRedeemablePoints}
                pointsDiscount={pointsDiscount}
                onUsePointsChange={handleUsePointsChange}
                onPointsToUseChange={setPointsToUse}
              />

              {/* Proceed to Payment Button */}
              <Button type="submit" className="w-full btn-gradient text-lg py-6" disabled={submitting}>
                {submitting ? 'Processing...' : `Proceed to Payment - ${formatPrice(finalTotal)}`}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By placing this order, you agree to our terms and conditions. Your order will be processed and shipped
                within 3-5 business days.
              </p>
            </div>
          </div>
        </form>

        {/* Suggested Products Section */}
        {mode === 'cart' && (
          <SuggestedProductsSection
            products={suggestedProducts}
            onAddProduct={addItem}
          />
        )}
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
        <CheckoutContent />
      </Suspense>
    </ProtectedRoute>
  );
}
