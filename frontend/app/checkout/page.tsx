'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
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
import { formatPrice, Product, productsService } from '@/lib/api/products';
import { ShoppingBag, CreditCard, Lock, Truck, Clock, Zap, CheckCircle, ExternalLink, Tag, X, Loader2, Plus, ChevronRight, Coins } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { redirectToCheckout } from '@/lib/stripe';

type CheckoutMode = 'cart' | 'design';

type ShippingMethod = 'standard' | 'express' | 'rush';

interface ShippingOption {
  id: ShippingMethod;
  name: string;
  price: number;
  description: string;
  deliveryDays: string;
  icon: React.ElementType;
}

// Countries supported for shipping (Royal Mail International)
const SHIPPING_COUNTRIES = [
  'United Kingdom',
  'Ireland',
  'France',
  'Germany',
  'Spain',
  'Italy',
  'Netherlands',
  'Belgium',
  'Austria',
  'Portugal',
  'Sweden',
  'Denmark',
  'Finland',
  'Norway',
  'Switzerland',
  'Poland',
  'Czech Republic',
  'Greece',
  'Hungary',
  'Romania',
  'Australia',
  'New Zealand',
  'Canada',
  'United States',
  'Japan',
  'Singapore',
  'Hong Kong',
  'United Arab Emirates',
];

const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: 'standard',
    name: 'Standard Delivery',
    price: 0,
    description: 'Free on orders over £50',
    deliveryDays: '3-5 business days',
    icon: Truck,
  },
  {
    id: 'express',
    name: 'Express Delivery',
    price: 7.99,
    description: 'Faster delivery',
    deliveryDays: '1-2 business days',
    icon: Clock,
  },
  {
    id: 'rush',
    name: 'Rush Delivery',
    price: 14.99,
    description: 'Priority production & shipping',
    deliveryDays: 'Next business day',
    icon: Zap,
  },
];

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
  const [_loadingSuggestions, setLoadingSuggestions] = useState(true);

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
        // Filter out products already in cart
        const filtered = products.filter(p => !cartProductIds.includes(p.id));
        setSuggestedProducts(filtered.slice(0, 4));
      } catch {
        // Silently fail - suggestions are not critical
      } finally {
        setLoadingSuggestions(false);
      }
    };

    if (mode === 'cart') {
      loadSuggestions();
    } else {
      setLoadingSuggestions(false);
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
  // Free shipping on orders over £50
  const freeShippingThreshold = 50;
  const qualifiesForFreeShipping = (mode === 'cart' ? subtotal : designPrice) >= freeShippingThreshold;
  const actualShippingCost = qualifiesForFreeShipping && shippingMethod === 'standard' ? 0 : shippingCost;

  // Get the final total based on mode
  const finalSubtotal = mode === 'cart' ? subtotal : designPrice;
  const finalTax = mode === 'cart' ? tax : 0;
  const discountAmount = appliedPromo?.discountAmount || 0;
  const pointsDiscount = usePoints ? pointsToUse / 100 : 0; // 100 points = £1
  const finalTotal = Math.max(0, finalSubtotal + finalTax + actualShippingCost - discountAmount - pointsDiscount);

  // Calculate max redeemable points (can't go below 0 total)
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

  const handleAddSuggestedProduct = (product: Product) => {
    const defaultVariant = product.variants?.find(v => v.isDefault) || product.variants?.[0];
    const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0];

    addItem({
      productId: product.id,
      variantId: defaultVariant?.id,
      productName: product.name,
      productSlug: product.slug,
      productImage: primaryImage?.imageUrl || '/placeholder-product.svg',
      unitPrice: defaultVariant?.price || product.basePrice,
      quantity: 1,
      size: defaultVariant?.size,
      color: defaultVariant?.color,
      material: defaultVariant?.material,
    });
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

    setSubmitting(true);

    try {
      let order;

      if (mode === 'cart') {
        // Create order from cart items
        order = await ordersService.create({
          items: cartItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
            customization: {
              size: item.size,
              color: item.color,
              material: item.material,
            },
          })),
          shippingAddress,
          subtotal: finalSubtotal + finalTax,
          discountAmount: discountAmount > 0 ? discountAmount : undefined,
          promoCode: appliedPromo?.code,
          pointsToRedeem: usePoints && pointsToUse >= 500 ? pointsToUse : undefined,
          totalPrice: finalTotal,
        });
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

      if (!order?.id) {
        throw new Error('Failed to create order');
      }

      // Create Stripe checkout session and redirect
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create checkout session');
      }

      // Store pending order info for cart clearing after successful payment
      // Store both item IDs and product+variant keys for robust matching after payment
      if (mode === 'cart' && order?.id) {
        sessionStorage.setItem('pendingOrderId', order.id);
        // Store current item IDs (should be server IDs after sync)
        sessionStorage.setItem('orderedItemIds', JSON.stringify([...selectedItemIds]));
        // Also store product+variant keys as fallback for ID matching
        const orderedProductKeys = cartItems.map(item =>
          `${item.productId}:${item.variantId || 'no-variant'}`
        );
        sessionStorage.setItem('orderedProductKeys', JSON.stringify(orderedProductKeys));
      }

      // Redirect to Stripe Checkout
      if (result.data?.url) {
        redirectToCheckout(result.data.url);
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string };
      setError(error?.error || error?.message || 'Failed to place order');
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
      {/* Main Content */}
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
              {/* Contact Information */}
              <Card className="card-glow">
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>We'll use this to send order updates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                      Email Address *
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-card/50"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                      Phone Number (Optional)
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+44 7700 900000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-card/50"
                    />
                    <p className="text-xs text-muted-foreground mt-1">For delivery updates</p>
                  </div>
                </CardContent>
              </Card>

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
                    <select
                      id="country"
                      value={shippingAddress.country}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                      required
                      className="w-full h-10 px-3 rounded-md border border-input bg-card/50 text-foreground"
                    >
                      {SHIPPING_COUNTRIES.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">We ship internationally via Royal Mail</p>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Method */}
              <Card className="card-glow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Shipping Method
                  </CardTitle>
                  <CardDescription>Choose your delivery speed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {SHIPPING_OPTIONS.map((option) => {
                    const IconComponent = option.icon;
                    const isSelected = shippingMethod === option.id;
                    const isFreeStandard = option.id === 'standard' && qualifiesForFreeShipping;
                    return (
                      <div
                        key={option.id}
                        onClick={() => setShippingMethod(option.id)}
                        className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className={`p-2 rounded-full ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{option.name}</span>
                            {isFreeStandard && (
                              <span className="text-xs bg-green-500/10 text-green-500 px-2 py-0.5 rounded">FREE</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{option.deliveryDays}</p>
                        </div>
                        <div className="text-right">
                          {isFreeStandard ? (
                            <span className="text-green-500 font-medium">FREE</span>
                          ) : option.price === 0 ? (
                            <span className="font-medium">FREE</span>
                          ) : (
                            <span className="font-medium">{formatPrice(option.price)}</span>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Stripe Payment Section */}
              <Card className="card-glow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment
                  </CardTitle>
                  <CardDescription>Secure payment via Stripe</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-card/50 rounded-lg border border-border">
                    <div className="flex-1">
                      <p className="font-medium">Secure Checkout</p>
                      <p className="text-sm text-muted-foreground">
                        You'll be redirected to Stripe to complete your payment securely.
                      </p>
                    </div>
                    <ExternalLink className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span>Your payment information is encrypted and secure</span>
                  </div>
                  <div className="flex gap-2">
                    <Image src="https://cdn.brandfolder.io/KGT2DTA4/at/8vbr8k4mr5xjwk4hxq4t9vs/Visa-logo.svg" alt="Visa" width={50} height={32} className="h-8 w-auto" />
                    <Image src="https://cdn.brandfolder.io/KGT2DTA4/at/rvgw3kcc58g4g4fm9n7bh3/Mastercard-logo.svg" alt="Mastercard" width={50} height={32} className="h-8 w-auto" />
                    <Image src="https://cdn.brandfolder.io/KGT2DTA4/at/x5v5z6w7h8fh8qxt6b5ggn/Amex-logo.svg" alt="Amex" width={50} height={32} className="h-8 w-auto" />
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
                        <div key={item.id} className="flex gap-3 py-2 border-b border-border last:border-0">
                          <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                            <Image
                              src={item.productImage || '/placeholder-product.svg'}
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
                      <div className="relative aspect-square w-full bg-card/30 rounded-lg overflow-hidden">
                        <Image
                          src={design.previewUrl || design.imageUrl}
                          alt={design.name}
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, 50vw"
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

                  {/* Promo Code */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Promo Code</label>
                    {appliedPromo ? (
                      <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-green-500" />
                          <div>
                            <span className="font-mono font-bold text-green-500">{appliedPromo.code}</span>
                            <p className="text-xs text-muted-foreground">{appliedPromo.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-500 font-medium">-{formatPrice(appliedPromo.discountAmount)}</span>
                          <button
                            type="button"
                            onClick={handleRemovePromo}
                            className="p-1 hover:bg-green-500/20 rounded"
                          >
                            <X className="h-4 w-4 text-green-500" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Enter code"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                          className="bg-card/50 uppercase"
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyPromo())}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleApplyPromo}
                          disabled={promoValidating || !promoCode.trim()}
                        >
                          {promoValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                        </Button>
                      </div>
                    )}
                    {promoError && (
                      <p className="text-xs text-red-500">{promoError}</p>
                    )}
                  </div>

                  {/* Loyalty Points Redemption */}
                  {userPoints >= 500 && (
                    <div className="space-y-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Coins className="h-4 w-4 text-yellow-500" />
                          Use Loyalty Points
                        </label>
                        <Switch
                          checked={usePoints}
                          onCheckedChange={(checked: boolean) => {
                            setUsePoints(checked);
                            if (checked) {
                              setPointsToUse(Math.min(maxRedeemablePoints, userPoints));
                            } else {
                              setPointsToUse(0);
                            }
                          }}
                        />
                      </div>
                      {usePoints && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Available: {userPoints} pts</span>
                            <span className="text-muted-foreground">(£{(userPoints / 100).toFixed(2)})</span>
                          </div>
                          <Slider
                            value={[pointsToUse]}
                            onValueChange={(values: number[]) => setPointsToUse(values[0])}
                            max={maxRedeemablePoints}
                            min={500}
                            step={100}
                            className="mt-2"
                          />
                          <div className="flex justify-between text-sm">
                            <span>Using: {pointsToUse} points</span>
                            <span className="text-green-500 font-medium">-£{(pointsToUse / 100).toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {userPoints > 0 && userPoints < 500 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Coins className="h-3 w-3" />
                      You have {userPoints} points. Earn {500 - userPoints} more to redeem!
                    </p>
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
                      <span className="text-muted-foreground">
                        Shipping ({selectedShipping?.name || 'Standard'}):
                      </span>
                      {actualShippingCost === 0 ? (
                        <span className="text-green-500">FREE</span>
                      ) : (
                        <span>{formatPrice(actualShippingCost)}</span>
                      )}
                    </div>
                    {appliedPromo && (
                      <div className="flex justify-between text-sm text-green-500">
                        <span>Discount ({appliedPromo.code}):</span>
                        <span>-{formatPrice(appliedPromo.discountAmount)}</span>
                      </div>
                    )}
                    {usePoints && pointsDiscount > 0 && (
                      <div className="flex justify-between text-sm text-yellow-500">
                        <span>Points Discount:</span>
                        <span>-{formatPrice(pointsDiscount)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-primary">{formatPrice(finalTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Proceed to Payment Button */}
              <Button type="submit" className="w-full btn-gradient text-lg py-6" loading={submitting}>
                {`Proceed to Payment - ${formatPrice(finalTotal)}`}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By placing this order, you agree to our terms and conditions. Your order will be processed and shipped
                within 3-5 business days.
              </p>
            </div>
          </div>
        </form>

        {/* Suggested Products Section */}
        {mode === 'cart' && suggestedProducts.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">You might also like</h2>
                <p className="text-sm text-muted-foreground">Add more items before you checkout</p>
              </div>
              <Link href="/products">
                <Button variant="ghost" size="sm">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {suggestedProducts.map((product) => {
                const primaryImage = product.images?.find(img => img.isPrimary) || product.images?.[0];
                const defaultVariant = product.variants?.find(v => v.isDefault) || product.variants?.[0];
                const price = defaultVariant?.price || product.basePrice;

                return (
                  <Card key={product.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative aspect-square bg-muted">
                      {primaryImage?.imageUrl ? (
                        <Image
                          src={primaryImage.imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <ShoppingBag className="h-8 w-8" />
                        </div>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleAddSuggestedProduct(product)}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-sm line-clamp-1">{product.name}</h3>
                      <p className="text-primary font-semibold text-sm mt-1">{formatPrice(price)}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
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
