'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ordersService, Order, ORDER_STATUS_LABELS } from '@/lib/api/orders';
import { shippingService } from '@/lib/api/shipping';
import { MATERIAL_LABELS, PRINT_SIZE_LABELS } from '@/lib/api/designs';
import apiClient from '@/lib/api/client';
import Link from 'next/link';

interface ApiHealth {
  status: string;
  message: string;
  responseTime?: number;
}

function AdminShippingContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [manualTracking, setManualTracking] = useState<{ [orderId: string]: string }>({});
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch orders that need shipping (payment_confirmed or printing status)
      const [ordersData, healthData] = await Promise.all([
        ordersService.list(1, 50),
        shippingService.healthCheck().catch(() => ({
          status: 'unhealthy',
          message: 'Failed to connect to Royal Mail API',
        })),
      ]);

      const ordersNeedingShipping = ordersData.orders.filter(
        (o) =>
          o.status === 'payment_confirmed' ||
          o.status === 'printing' ||
          (o.status === 'shipped' && !o.trackingNumber)
      );

      setOrders(ordersNeedingShipping);
      setApiHealth(healthData);
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleManualShip = async (order: Order) => {
    const trackingNumber = manualTracking[order.id];

    if (!trackingNumber || !trackingNumber.trim()) {
      setError('Please enter a tracking number');
      return;
    }

    setUpdatingOrderId(order.id);
    setError('');
    setSuccess('');

    try {
      // Update order with manual tracking number
      // Note: This requires a backend endpoint to update tracking number
      await apiClient.put(`/orders/${order.id}/tracking`, {
        trackingNumber: trackingNumber.trim(),
      });

      // Update order status to shipped
      await apiClient.put(`/orders/${order.id}/status`, {
        status: 'shipped',
      });

      setSuccess(`Order ${order.id.slice(0, 8)} marked as shipped with tracking number`);

      // Remove from list
      setOrders(orders.filter((o) => o.id !== order.id));
      setManualTracking((prev) => {
        const updated = { ...prev };
        delete updated[order.id];
        return updated;
      });
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to update order');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (user && user.userType !== 'PRINTER_ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                ← Back to Admin
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Shipping Management</span>
            </h1>
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

        {success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-3 rounded-lg text-sm mb-6">
            {success}
          </div>
        )}

        {/* API Health Status */}
        {apiHealth && (
          <Card className="card-glow mb-6">
            <CardHeader>
              <CardTitle>Royal Mail API Status</CardTitle>
              <CardDescription>Current status of shipping API integration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-md ${
                      apiHealth.status === 'healthy'
                        ? 'bg-green-500'
                        : apiHealth.status === 'degraded'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                  ></div>
                  <div>
                    <p className="font-semibold capitalize">{apiHealth.status}</p>
                    <p className="text-sm text-muted-foreground">{apiHealth.message}</p>
                  </div>
                </div>
                {apiHealth.responseTime && (
                  <Badge variant="outline">{apiHealth.responseTime}ms</Badge>
                )}
              </div>

              {apiHealth.status !== 'healthy' && (
                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-500 mb-2">
                    ⚠️ Manual Label Generation Required
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The Royal Mail API is currently unavailable. Use the manual process below to
                    create shipping labels and enter tracking numbers.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Manual Fallback Instructions */}
        <Card className="card-glow mb-6">
          <CardHeader>
            <CardTitle>Manual Shipping Process</CardTitle>
            <CardDescription>How to create labels when the API is unavailable</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="font-bold text-primary">1.</span>
                <span>
                  Go to Royal Mail Click & Drop website:{' '}
                  <a
                    href="https://www.royalmail.com/click-and-drop"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    royalmail.com/click-and-drop
                  </a>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">2.</span>
                <span>Create a new shipment using the customer's shipping address below</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">3.</span>
                <span>Download and print the shipping label</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">4.</span>
                <span>Copy the tracking number from the label</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-primary">5.</span>
                <span>Enter the tracking number in the form below and click "Mark as Shipped"</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Orders Needing Shipping */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle>Orders Awaiting Shipment</CardTitle>
            <CardDescription>
              {orders.length} order{orders.length !== 1 ? 's' : ''} ready to ship
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-md h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading orders...</p>
                </div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No orders awaiting shipment</p>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order.id} className="p-6 bg-card/30 rounded-lg space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">
                          Order #{order.id.slice(0, 8).toUpperCase()}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {order.design?.name || 'Design'} • {MATERIAL_LABELS[order.material]} •{' '}
                          {PRINT_SIZE_LABELS[order.printSize]}
                        </p>
                      </div>
                      <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/50 border">
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </div>

                    <Separator />

                    {/* Shipping Address */}
                    <div>
                      <p className="text-sm font-semibold mb-2">Shipping Address:</p>
                      <div className="text-sm bg-muted/30 p-3 rounded-lg space-y-1">
                        <p className="font-medium">{order.shippingAddress.name}</p>
                        <p>{order.shippingAddress.addressLine1}</p>
                        {order.shippingAddress.addressLine2 && (
                          <p>{order.shippingAddress.addressLine2}</p>
                        )}
                        <p>
                          {order.shippingAddress.city}, {order.shippingAddress.postcode}
                        </p>
                        <p>{order.shippingAddress.country}</p>
                      </div>
                    </div>

                    <Separator />

                    {/* Manual Tracking Number Entry */}
                    <div>
                      <p className="text-sm font-semibold mb-2">Enter Tracking Number:</p>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="e.g., RM123456789GB"
                          value={manualTracking[order.id] || ''}
                          onChange={(e) =>
                            setManualTracking({
                              ...manualTracking,
                              [order.id]: e.target.value,
                            })
                          }
                          className="flex-1 bg-card/50 font-mono"
                        />
                        <Button
                          onClick={() => handleManualShip(order)}
                          disabled={!manualTracking[order.id] || updatingOrderId === order.id}
                          className="btn-gradient"
                        >
                          {updatingOrderId === order.id ? 'Updating...' : 'Mark as Shipped'}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        This will update the order status to "Shipped" and notify the customer
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function AdminShippingPage() {
  return (
    <ProtectedRoute>
      <AdminShippingContent />
    </ProtectedRoute>
  );
}
