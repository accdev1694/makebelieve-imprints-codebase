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
import { MATERIAL_LABELS, PRINT_SIZE_LABELS } from '@/lib/api/designs';
import apiClient from '@/lib/api/client';
import Link from 'next/link';
import { Package, Truck, Download, FileText, RefreshCw, CheckCircle, AlertCircle, Trash2, ExternalLink } from 'lucide-react';

interface ApiHealth {
  status: string;
  provider?: string;
  version?: string;
  error?: string;
  timestamp?: string;
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
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [manifesting, setManifesting] = useState(false);

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
      setError('');

      // Fetch orders and health status in parallel
      const [ordersData, healthResponse] = await Promise.all([
        ordersService.list(1, 50),
        fetch('/api/shipping/health').then(res => res.json()).catch(() => ({
          status: 'error',
          error: 'Failed to connect to Royal Mail API',
        })),
      ]);

      // Filter orders that need shipping action
      const ordersNeedingShipping = ordersData.orders.filter(
        (o) =>
          o.status === 'confirmed' ||
          o.status === 'printing' ||
          (o.status === 'shipped' && !o.trackingNumber)
      );

      setOrders(ordersNeedingShipping);
      setApiHealth(healthResponse);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateShipment = async (order: Order) => {
    setProcessingOrderId(order.id);
    setProcessingAction('shipment');
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/shipping/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          weightInGrams: 500, // Default weight, could be made configurable
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create shipment');
      }

      setSuccess(`Shipment created for order #${order.id.slice(0, 8).toUpperCase()}. Pay and print label in Click & Drop.`);
      fetchData(); // Refresh to get updated order
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create shipment';
      setError(message);
    } finally {
      setProcessingOrderId(null);
      setProcessingAction(null);
    }
  };

  const handleDownloadLabel = async (order: Order) => {
    setProcessingOrderId(order.id);
    setProcessingAction('label');
    setError('');

    try {
      const response = await fetch(`/api/shipping/labels/${order.id}`);

      if (!response.ok) {
        const data = await response.json();

        // Handle payment required - redirect to Click & Drop
        if (response.status === 402 || data.code === 'PAYMENT_REQUIRED') {
          window.open(data.clickAndDropUrl || 'https://parcel.royalmail.com/orders', '_blank');
          setError('Payment required. Opening Click & Drop to pay and print label...');
          return;
        }

        throw new Error(data.error || 'Failed to download label');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `label-${order.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`Label downloaded for order #${order.id.slice(0, 8).toUpperCase()}`);
      fetchData(); // Refresh to get tracking number
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to download label';
      setError(message);
    } finally {
      setProcessingOrderId(null);
      setProcessingAction(null);
    }
  };

  const handleManualShip = async (order: Order) => {
    const trackingNumber = manualTracking[order.id];

    if (!trackingNumber || !trackingNumber.trim()) {
      setError('Please enter a tracking number');
      return;
    }

    setProcessingOrderId(order.id);
    setProcessingAction('manual');
    setError('');
    setSuccess('');

    try {
      // Update order status to shipped with tracking number
      await apiClient.patch(`/orders/${order.id}/status`, {
        status: 'shipped',
        trackingNumber: trackingNumber.trim(),
      });

      setSuccess(`Order #${order.id.slice(0, 8).toUpperCase()} marked as shipped`);

      // Remove from list
      setOrders(orders.filter((o) => o.id !== order.id));
      setManualTracking((prev) => {
        const updated = { ...prev };
        delete updated[order.id];
        return updated;
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update order';
      setError(message);
    } finally {
      setProcessingOrderId(null);
      setProcessingAction(null);
    }
  };

  const handleManifest = async () => {
    setManifesting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/shipping/manifest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create manifest');
      }

      setSuccess(`Manifest #${data.manifestNumber} created. Orders are ready for Royal Mail collection.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create manifest';
      setError(message);
    } finally {
      setManifesting(false);
    }
  };

  const handleDeleteShipment = async (order: Order) => {
    if (!confirm(`Delete Royal Mail shipment for order #${order.id.slice(0, 8).toUpperCase()}? This will remove it from Royal Mail and clear shipping data.`)) {
      return;
    }

    setProcessingOrderId(order.id);
    setProcessingAction('delete');
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/shipping/shipments/${order.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete shipment');
      }

      setSuccess(`Shipment deleted for order #${order.id.slice(0, 8).toUpperCase()}`);
      fetchData(); // Refresh to get updated order
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete shipment';
      setError(message);
    } finally {
      setProcessingOrderId(null);
      setProcessingAction(null);
    }
  };

  const isApiHealthy = apiHealth?.status === 'healthy';

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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {isApiHealthy && orders.some(o => o.royalmailOrderId) && (
              <Button
                onClick={handleManifest}
                disabled={manifesting}
                className="btn-gradient"
              >
                <FileText className="h-4 w-4 mr-2" />
                {manifesting ? 'Creating...' : 'Manifest Orders'}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
            <button onClick={() => setError('')} className="ml-auto font-bold">×</button>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-3 rounded-lg text-sm mb-6 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            {success}
            <button onClick={() => setSuccess('')} className="ml-auto font-bold">×</button>
          </div>
        )}

        {/* API Health Status */}
        <Card className="card-glow mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Royal Mail API Status
            </CardTitle>
            <CardDescription>Click & Drop API integration status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isApiHealthy
                      ? 'bg-green-500'
                      : apiHealth?.status === 'unhealthy'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                  }`}
                />
                <div>
                  <p className="font-semibold capitalize">
                    {isApiHealthy ? 'Connected' : 'Disconnected'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {apiHealth?.provider || 'Royal Mail Click & Drop'}
                    {apiHealth?.version && ` (v${apiHealth.version})`}
                  </p>
                </div>
              </div>
              {isApiHealthy ? (
                <Badge className="bg-green-500/10 text-green-500 border-green-500/50">
                  Ready
                </Badge>
              ) : (
                <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/50">
                  Manual Mode
                </Badge>
              )}
            </div>

            {!isApiHealthy && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-500 mb-2">
                  ⚠️ API Unavailable - Using Manual Mode
                </p>
                <p className="text-sm text-muted-foreground">
                  {apiHealth?.error || 'Cannot connect to Royal Mail API. Use manual label generation via Click & Drop website.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Fallback Instructions - Only show when API is down */}
        {!isApiHealthy && (
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
                    Go to Royal Mail Click & Drop:{' '}
                    <a
                      href="https://parcel.royalmail.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      parcel.royalmail.com
                    </a>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary">2.</span>
                  <span>Create a new order using the customer's shipping address</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary">3.</span>
                  <span>Print the shipping label</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-primary">4.</span>
                  <span>Enter the tracking number below and mark as shipped</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Orders Needing Shipping */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Orders Awaiting Shipment
            </CardTitle>
            <CardDescription>
              {orders.length} order{orders.length !== 1 ? 's' : ''} ready to ship
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading orders...</p>
                </div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">All orders have been shipped!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => {
                  const hasRoyalMailOrder = !!order.royalmailOrderId;
                  const isProcessing = processingOrderId === order.id;

                  return (
                    <div key={order.id} className="p-6 bg-card/30 rounded-lg space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">
                            Order #{order.id.slice(0, 8).toUpperCase()}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {order.items?.length || 0} item(s) • £{Number(order.totalPrice).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasRoyalMailOrder && (
                            <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/50">
                              RM: {order.royalmailOrderId}
                            </Badge>
                          )}
                          <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/50">
                            {ORDER_STATUS_LABELS[order.status] || order.status}
                          </Badge>
                        </div>
                      </div>

                      <Separator />

                      {/* Shipping Address */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-semibold mb-2">Shipping Address:</p>
                          <div className="text-sm bg-muted/30 p-3 rounded-lg space-y-1">
                            <p className="font-medium">{order.shippingAddress?.name}</p>
                            <p>{order.shippingAddress?.addressLine1}</p>
                            {order.shippingAddress?.addressLine2 && (
                              <p>{order.shippingAddress.addressLine2}</p>
                            )}
                            <p>
                              {order.shippingAddress?.city}, {order.shippingAddress?.postcode}
                            </p>
                            <p>{order.shippingAddress?.country}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div>
                          <p className="text-sm font-semibold mb-2">Actions:</p>
                          <div className="space-y-2">
                            {isApiHealthy && !hasRoyalMailOrder && (
                              <Button
                                onClick={() => handleCreateShipment(order)}
                                disabled={isProcessing}
                                className="w-full"
                                variant="outline"
                              >
                                <Package className="h-4 w-4 mr-2" />
                                {isProcessing && processingAction === 'shipment'
                                  ? 'Creating...'
                                  : 'Create Shipment'}
                              </Button>
                            )}

                            {hasRoyalMailOrder && (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => window.open('https://parcel.royalmail.com/orders', '_blank')}
                                  className="flex-1 btn-gradient"
                                >
                                  <ExternalLink className="h-4 w-4 mr-2" />
                                  Pay & Print in Click & Drop
                                </Button>
                                <Button
                                  onClick={() => handleDeleteShipment(order)}
                                  disabled={isProcessing}
                                  variant="destructive"
                                  size="icon"
                                  title="Delete shipment"
                                >
                                  {isProcessing && processingAction === 'delete' ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            )}

                            {/* Manual tracking input */}
                            <div className="flex gap-2">
                              <Input
                                type="text"
                                placeholder="Tracking number"
                                value={manualTracking[order.id] || ''}
                                onChange={(e) =>
                                  setManualTracking({
                                    ...manualTracking,
                                    [order.id]: e.target.value,
                                  })
                                }
                                className="flex-1 bg-card/50 font-mono text-sm"
                              />
                              <Button
                                onClick={() => handleManualShip(order)}
                                disabled={!manualTracking[order.id] || isProcessing}
                                variant="secondary"
                                size="sm"
                              >
                                {isProcessing && processingAction === 'manual'
                                  ? '...'
                                  : 'Ship'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
