'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ordersService, Order, OrderStatus, ORDER_STATUS_LABELS } from '@/lib/api/orders';
import { MATERIAL_LABELS, PRINT_SIZE_LABELS } from '@/lib/api/designs';
import apiClient from '@/lib/api/client';
import Link from 'next/link';

function AdminOrdersContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, currentPage]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await ordersService.list(
        currentPage,
        15,
        statusFilter === 'all' ? undefined : statusFilter
      );
      setOrders(data.orders);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    setError('');

    try {
      await apiClient.put(`/orders/${orderId}/status`, { status: newStatus });

      // Update local state
      setOrders(
        orders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
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

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const workflow: Record<OrderStatus, OrderStatus | null> = {
      pending: 'payment_confirmed',
      payment_confirmed: 'printing',
      printing: 'shipped',
      shipped: 'delivered',
      delivered: null,
      cancelled: null,
    };
    return workflow[currentStatus];
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
              <span className="text-neon-gradient">Order Management</span>
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

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setStatusFilter('all');
              setCurrentPage(1);
            }}
            className={statusFilter === 'all' ? 'btn-gradient' : ''}
          >
            All Orders
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setStatusFilter('pending');
              setCurrentPage(1);
            }}
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === 'payment_confirmed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setStatusFilter('payment_confirmed');
              setCurrentPage(1);
            }}
          >
            Confirmed
          </Button>
          <Button
            variant={statusFilter === 'printing' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setStatusFilter('printing');
              setCurrentPage(1);
            }}
          >
            Printing
          </Button>
          <Button
            variant={statusFilter === 'shipped' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setStatusFilter('shipped');
              setCurrentPage(1);
            }}
          >
            Shipped
          </Button>
          <Button
            variant={statusFilter === 'delivered' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setStatusFilter('delivered');
              setCurrentPage(1);
            }}
          >
            Delivered
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading orders...</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <Card className="card-glow">
            <CardContent className="py-20 text-center">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {statusFilter === 'all' ? 'No orders yet' : `No ${statusFilter} orders`}
              </h3>
              <p className="text-muted-foreground">
                {statusFilter === 'all'
                  ? 'Orders will appear here once customers start placing them.'
                  : 'Try selecting a different filter to see other orders.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const nextStatus = getNextStatus(order.status);
              const isUpdating = updatingOrderId === order.id;

              return (
                <Card key={order.id} className="card-glow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Order Image and Basic Info */}
                      <div className="flex gap-4 flex-1">
                        {order.design && (
                          <div className="w-24 h-24 bg-card/30 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                            <img
                              src={
                                order.previewUrl ||
                                order.design.previewUrl ||
                                order.design.imageUrl
                              }
                              alt={order.design.name}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        )}

                        <div className="flex-1 space-y-2">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {order.design?.name || 'Design'}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Order #{order.id.slice(0, 8).toUpperCase()}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-muted-foreground">Material</p>
                              <p className="font-medium">{MATERIAL_LABELS[order.material]}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Size</p>
                              <p className="font-medium">{PRINT_SIZE_LABELS[order.printSize]}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Price</p>
                              <p className="font-medium text-primary">
                                £{order.totalPrice.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Order Date</p>
                              <p className="font-medium">
                                {new Date(order.createdAt).toLocaleDateString('en-GB')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator className="lg:hidden" />

                      {/* Customer & Status Info */}
                      <div className="lg:w-80 space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Customer</h4>
                          <div className="text-sm bg-muted/30 p-3 rounded-lg space-y-1">
                            <p className="font-medium text-foreground">
                              {order.shippingAddress.name}
                            </p>
                            <p className="text-muted-foreground">
                              {order.shippingAddress.city}, {order.shippingAddress.postcode}
                            </p>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Status</h4>
                          <div className="space-y-2">
                            <Badge className={`${getStatusColor(order.status)} border px-3 py-1 w-full justify-center`}>
                              {ORDER_STATUS_LABELS[order.status]}
                            </Badge>

                            {nextStatus && (
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => handleUpdateStatus(order.id, nextStatus)}
                                disabled={isUpdating}
                              >
                                {isUpdating
                                  ? 'Updating...'
                                  : `Mark as ${ORDER_STATUS_LABELS[nextStatus]}`}
                              </Button>
                            )}

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => router.push(`/admin/orders/${order.id}`)}
                              >
                                View Details
                              </Button>
                              {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                                  disabled={isUpdating}
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <ProtectedRoute>
      <AdminOrdersContent />
    </ProtectedRoute>
  );
}
