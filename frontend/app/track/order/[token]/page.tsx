'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Package, Truck, MapPin, Clock, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

interface TrackingOrder {
  id: string;
  status: string;
  totalPrice: number;
  subtotal: number | null;
  discountAmount: number | null;
  trackingNumber: string | null;
  carrier: string | null;
  createdAt: string;
  updatedAt: string;
  shippingAddress: {
    name: string;
    city: string;
    country: string;
    postcodeArea: string;
  };
  items: Array<{
    id: string;
    productName: string;
    productImage: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  design: {
    title: string;
    previewUrl: string;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Package }> = {
  pending: { label: 'Order Received', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50', icon: Clock },
  payment_confirmed: { label: 'Payment Confirmed', color: 'bg-blue-500/10 text-blue-500 border-blue-500/50', icon: CheckCircle2 },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-500 border-blue-500/50', icon: CheckCircle2 },
  printing: { label: 'In Production', color: 'bg-purple-500/10 text-purple-500 border-purple-500/50', icon: Package },
  shipped: { label: 'Shipped', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/50', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-500/10 text-green-500 border-green-500/50', icon: CheckCircle2 },
  cancellation_requested: { label: 'Cancellation Requested', color: 'bg-amber-500/10 text-amber-500 border-amber-500/50', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-500 border-red-500/50', icon: AlertCircle },
  refunded: { label: 'Refunded', color: 'bg-orange-500/10 text-orange-500 border-orange-500/50', icon: AlertCircle },
};

const STATUS_STEPS = ['pending', 'confirmed', 'printing', 'shipped', 'delivered'];

export default function OrderTrackingPage() {
  const params = useParams();
  const token = params.token as string;

  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/orders/track/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to load order');
          return;
        }

        setOrder(data.data.order);
      } catch {
        setError('Failed to load order. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [token]);

  const getStatusIndex = (status: string) => {
    // Map payment_confirmed to confirmed for progress display
    const mappedStatus = status === 'payment_confirmed' ? 'confirmed' : status;
    return STATUS_STEPS.indexOf(mappedStatus);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-10 w-64 mb-8" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-4">
              {error || 'This tracking link may be invalid or expired.'}
            </p>
            <Link href="/">
              <Button>Go to Homepage</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const currentStepIndex = getStatusIndex(order.status);
  const isCancelledOrRefunded = ['cancelled', 'refunded', 'cancellation_requested'].includes(order.status);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/logo.png"
              alt="MakeBelieve Imprints"
              width={40}
              height={40}
              className="rounded-lg border border-foreground/20"
            />
            <span className="font-semibold hidden sm:inline">MakeBelieve Imprints</span>
          </Link>
          <Badge variant="outline" className="text-xs">
            Order Tracking
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Track Your Order</h1>
          <p className="text-muted-foreground">
            Order placed on {new Date(order.createdAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${statusConfig.color}`}>
                  <StatusIcon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Order Status</CardTitle>
                  <Badge className={`${statusConfig.color} border mt-1`}>
                    {statusConfig.label}
                  </Badge>
                </div>
              </div>
              {order.trackingNumber && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Tracking Number</p>
                  <p className="font-mono font-semibold">{order.trackingNumber}</p>
                  {order.carrier && (
                    <p className="text-xs text-muted-foreground">{order.carrier}</p>
                  )}
                </div>
              )}
            </div>
          </CardHeader>

          {/* Progress Steps */}
          {!isCancelledOrRefunded && (
            <CardContent className="pt-0">
              <div className="flex items-center justify-between relative mt-4">
                {/* Progress Line */}
                <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
                  />
                </div>

                {STATUS_STEPS.map((step, index) => {
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const StepConfig = STATUS_CONFIG[step];

                  return (
                    <div key={step} className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                          isCompleted
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'bg-background border-muted'
                        } ${isCurrent ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <span className="text-xs text-muted-foreground">{index + 1}</span>
                        )}
                      </div>
                      <span className={`text-xs mt-2 text-center hidden sm:block ${
                        isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}>
                        {StepConfig?.label || step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>

        {/* Order Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-3 bg-muted/30 rounded-lg"
                >
                  <div className="w-16 h-16 bg-card rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={item.productImage}
                      alt={item.productName}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{item.productName}</h4>
                    {item.variantName && (
                      <p className="text-sm text-muted-foreground">{item.variantName}</p>
                    )}
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold">&pound;{item.totalPrice.toFixed(2)}</p>
                  </div>
                </div>
              ))}

              {/* Custom Design */}
              {order.design && (
                <div className="flex gap-4 p-3 bg-muted/30 rounded-lg">
                  <div className="w-16 h-16 bg-card rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={order.design.previewUrl}
                      alt={order.design.title}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{order.design.title}</h4>
                    <p className="text-sm text-muted-foreground">Custom Design</p>
                  </div>
                </div>
              )}
            </div>

            {/* Order Total */}
            <div className="mt-6 pt-4 border-t space-y-2">
              {order.subtotal && order.discountAmount && order.discountAmount > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>&pound;{order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-&pound;{order.discountAmount.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>&pound;{order.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Delivery Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Truck className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{order.shippingAddress.name}</p>
                <p className="text-muted-foreground">
                  {order.shippingAddress.city && `${order.shippingAddress.city}, `}
                  {order.shippingAddress.postcodeArea && `${order.shippingAddress.postcodeArea}, `}
                  {order.shippingAddress.country}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Questions about your order?</p>
          <Link href="/contact" className="text-primary hover:underline inline-flex items-center gap-1">
            Contact Us <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </main>
    </div>
  );
}
