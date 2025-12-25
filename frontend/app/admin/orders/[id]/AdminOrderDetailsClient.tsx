'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ordersService, Order, ORDER_STATUS_LABELS, OrderStatus } from '@/lib/api/orders';
import { MATERIAL_LABELS, PRINT_SIZE_LABELS } from '@/lib/api/designs';
import apiClient from '@/lib/api/client';
import Link from 'next/link';

interface AdminOrderDetailsClientProps {
  orderId: string;
}

function AdminOrderDetailsContent({ orderId }: AdminOrderDetailsClientProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

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

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;

    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.put(`/orders/${order.id}/status`, { status: newStatus });
      setOrder({ ...order, status: newStatus });
      setSuccess(`Order status updated to ${ORDER_STATUS_LABELS[newStatus]}`);
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

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

  if (user && user.userType !== 'PRINTER_ADMIN') {
    return null;
  }

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

  if (error && !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push('/admin/orders')}>Back to Orders</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/orders">
              <Button variant="ghost" size="sm">
                ← Back to Orders
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">
                Order #{order.id.slice(0, 8).toUpperCase()}
              </span>
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-3 rounded-lg text-sm mb-6">
            {success}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
                <CardDescription>
                  Placed on{' '}
                  {new Date(order.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {order.design && (
                  <div className="flex gap-4 items-start">
                    <div className="w-32 h-32 bg-card/30 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                      <img
                        src={order.previewUrl || order.design.previewUrl || order.design.imageUrl}
                        alt={order.design.name}
                        className="max-w-full max-h-full object-contain"
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

            <Card className="card-glow">
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 p-4 rounded-lg space-y-1 text-sm">
                  <p className="font-medium text-foreground text-base">
                    {order.shippingAddress.name}
                  </p>
                  <p className="text-muted-foreground">{order.shippingAddress.addressLine1}</p>
                  {order.shippingAddress.addressLine2 && (
                    <p className="text-muted-foreground">{order.shippingAddress.addressLine2}</p>
                  )}
                  <p className="text-muted-foreground">
                    {order.shippingAddress.city}, {order.shippingAddress.postcode}
                  </p>
                  <p className="text-muted-foreground">{order.shippingAddress.country}</p>
                </div>

                {order.trackingNumber && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Tracking Number:</p>
                    <p className="font-mono text-sm bg-muted/30 p-3 rounded-lg">
                      {order.trackingNumber}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="card-glow">
              <CardHeader>
                <CardTitle>Order Status</CardTitle>
                <CardDescription>Update order progress</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <Badge className={`${getStatusColor(order.status)} border px-4 py-2 text-base`}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                </div>

                <Separator />

                <div className="space-y-2">
                  <p className="text-sm font-medium mb-3">Update Status:</p>

                  {order.status === 'pending' && (
                    <Button
                      className="w-full"
                      onClick={() => handleUpdateStatus('payment_confirmed')}
                      disabled={updating}
                    >
                      Confirm Payment
                    </Button>
                  )}

                  {order.status === 'payment_confirmed' && (
                    <Button
                      className="w-full"
                      onClick={() => handleUpdateStatus('printing')}
                      disabled={updating}
                    >
                      Start Printing
                    </Button>
                  )}

                  {order.status === 'printing' && (
                    <Button
                      className="w-full"
                      onClick={() => handleUpdateStatus('shipped')}
                      disabled={updating}
                    >
                      Mark as Shipped
                    </Button>
                  )}

                  {order.status === 'shipped' && (
                    <Button
                      className="w-full"
                      onClick={() => handleUpdateStatus('delivered')}
                      disabled={updating}
                    >
                      Mark as Delivered
                    </Button>
                  )}

                  {order.status !== 'cancelled' && order.status !== 'delivered' && (
                    <>
                      <Separator />
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => handleUpdateStatus('cancelled')}
                        disabled={updating}
                      >
                        Cancel Order
                      </Button>
                    </>
                  )}

                  {(order.status === 'delivered' || order.status === 'cancelled') && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      This order is {order.status}. No further actions available.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="card-glow">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full" disabled>
                  Print Label
                </Button>
                <Button variant="outline" className="w-full" disabled>
                  Send Email Update
                </Button>
                <Button variant="outline" className="w-full" disabled>
                  Download Invoice
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdminOrderDetailsClient({ orderId }: AdminOrderDetailsClientProps) {
  return (
    <ProtectedRoute>
      <AdminOrderDetailsContent orderId={orderId} />
    </ProtectedRoute>
  );
}
