'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ordersService, Order, ORDER_STATUS_LABELS, OrderStatus } from '@/lib/api/orders';
import { MATERIAL_LABELS, PRINT_SIZE_LABELS } from '@/lib/api/designs';
import Link from 'next/link';
import Image from 'next/image';

function OrderDetailsContent() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();

  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        setError('No order ID provided');
        setLoading(false);
        return;
      }

      try {
        const orderData = await ordersService.get(orderId);
        setOrder(orderData);
      } catch (err: any) {
        setError(err?.error || err?.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  const getStatusColor = (status: OrderStatus): string => {
    const colors: Record<OrderStatus, string> = {
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50',
      payment_confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
      printing: 'bg-purple-500/10 text-purple-500 border-purple-500/50',
      shipped: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/50',
      delivered: 'bg-green-500/10 text-green-500 border-green-500/50',
      cancelled: 'bg-red-500/10 text-red-500 border-red-500/50',
    };
    return colors[status];
  };

  const getStatusIcon = (status: OrderStatus): string => {
    const icons: Record<OrderStatus, string> = {
      pending: '⏳',
      payment_confirmed: '✓',
      printing: '🖨️',
      shipped: '📦',
      delivered: '✅',
      cancelled: '❌',
    };
    return icons[status];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-md h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error || 'Order not found'}</p>
            <Button onClick={() => router.push('/orders')}>Back to Orders</Button>
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
            <Link href="/orders">
              <Button variant="ghost" size="sm">
                ← Back to Orders
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Order Details</span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Order Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Order #{order.id.slice(0, 8).toUpperCase()}</h2>
            <p className="text-sm text-muted-foreground">
              Placed on{' '}
              {new Date(order.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <Badge className={`${getStatusColor(order.status)} border px-4 py-2 text-base`}>
            {getStatusIcon(order.status)} {ORDER_STATUS_LABELS[order.status]}
          </Badge>
        </div>

        {/* Order Timeline */}
        <Card className="card-glow mb-6">
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
            <CardDescription>Track your order progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Timeline */}
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>
                <div className="space-y-6">
                  {/* Pending */}
                  <div className="flex gap-4 relative">
                    <div
                      className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                        order.status === 'pending' ||
                        order.status === 'payment_confirmed' ||
                        order.status === 'printing' ||
                        order.status === 'shipped' ||
                        order.status === 'delivered'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      ✓
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Order Placed</p>
                      <p className="text-sm text-muted-foreground">Your order has been received</p>
                    </div>
                  </div>

                  {/* Payment Confirmed */}
                  <div className="flex gap-4 relative">
                    <div
                      className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                        order.status === 'payment_confirmed' ||
                        order.status === 'printing' ||
                        order.status === 'shipped' ||
                        order.status === 'delivered'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {order.status === 'payment_confirmed' ||
                      order.status === 'printing' ||
                      order.status === 'shipped' ||
                      order.status === 'delivered'
                        ? '✓'
                        : '○'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Payment Confirmed</p>
                      <p className="text-sm text-muted-foreground">
                        Payment successfully processed
                      </p>
                    </div>
                  </div>

                  {/* Printing */}
                  <div className="flex gap-4 relative">
                    <div
                      className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                        order.status === 'printing' ||
                        order.status === 'shipped' ||
                        order.status === 'delivered'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {order.status === 'printing' ||
                      order.status === 'shipped' ||
                      order.status === 'delivered'
                        ? '✓'
                        : '○'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Printing</p>
                      <p className="text-sm text-muted-foreground">Your design is being printed</p>
                    </div>
                  </div>

                  {/* Shipped */}
                  <div className="flex gap-4 relative">
                    <div
                      className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                        order.status === 'shipped' || order.status === 'delivered'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {order.status === 'shipped' || order.status === 'delivered' ? '✓' : '○'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Shipped</p>
                      <p className="text-sm text-muted-foreground">Your order is on its way</p>
                      {order.trackingNumber && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">Tracking Number:</p>
                          <p className="font-mono text-sm mb-2">{order.trackingNumber}</p>
                          <Link href={`/track?number=${order.trackingNumber}`}>
                            <Button size="sm" variant="outline" className="text-xs">
                              Track Shipment →
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delivered */}
                  <div className="flex gap-4 relative">
                    <div
                      className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                        order.status === 'delivered'
                          ? 'bg-green-500 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {order.status === 'delivered' ? '✓' : '○'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Delivered</p>
                      <p className="text-sm text-muted-foreground">Order successfully delivered</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card className="card-glow mb-6">
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {order.design && (
              <div className="flex gap-4 items-start">
                <div className="w-32 h-32 bg-card/30 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                  <Image
                    src={order.previewUrl || order.design.previewUrl || order.design.imageUrl}
                    alt={order.design.name}
                    fill
                    sizes="128px"
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-lg">{order.design.name}</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Material:</p>
                      <p className="font-medium">{MATERIAL_LABELS[order.material]}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Size:</p>
                      <p className="font-medium">{PRINT_SIZE_LABELS[order.printSize]}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Dimensions:</p>
                      <p className="font-medium">
                        {order.printWidth} × {order.printHeight} cm
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Orientation:</p>
                      <p className="font-medium capitalize">{order.orientation}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Shipping Address */}
            <div>
              <h4 className="font-semibold mb-3">Shipping Address</h4>
              <div className="text-sm text-muted-foreground space-y-1 bg-muted/30 p-4 rounded-lg">
                <p className="font-medium text-foreground">{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.addressLine1}</p>
                {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.postcode}
                </p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </div>

            <Separator />

            {/* Price Summary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>£{order.totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping:</span>
                <span className="text-green-500">FREE</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-primary">£{order.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/orders">
            <Button variant="outline" className="w-full sm:w-auto">
              Back to Orders
            </Button>
          </Link>
          {order.trackingNumber && (
            <Link href={`/track?number=${order.trackingNumber}`}>
              <Button variant="outline" className="w-full sm:w-auto">
                Track Shipment
              </Button>
            </Link>
          )}
          <Link href="/design/new">
            <Button className="btn-gradient w-full sm:w-auto">Create Another Design</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function OrderDetailsPage() {
  return (
    <ProtectedRoute>
      <OrderDetailsContent />
    </ProtectedRoute>
  );
}
