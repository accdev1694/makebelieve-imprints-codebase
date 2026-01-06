'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ordersService,
  Order,
  OrderStatus,
  ORDER_STATUS_LABELS,
  OrderTab,
  ORDER_TAB_LABELS,
  ADMIN_SORT_OPTIONS,
  SortOption,
} from '@/lib/api/orders';
import { MATERIAL_LABELS, PRINT_SIZE_LABELS } from '@/lib/api/designs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import apiClient from '@/lib/api/client';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpDown } from 'lucide-react';

const ORDER_TABS: OrderTab[] = ['all', 'in_progress', 'shipped', 'completed', 'cancelled'];

function AdminOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>(ADMIN_SORT_OPTIONS[0]);

  // Get active tab from URL or default to 'all'
  const activeTab = (searchParams.get('tab') as OrderTab) || 'all';

  // Redirect if not admin
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ordersService.list(currentPage, 15, {
        tab: activeTab,
        sort: sortOption.field,
        order: sortOption.order,
      });
      setOrders(data.orders);
      setTotalPages(data.pagination.totalPages);
    } catch (err: unknown) {
      const e = err as { error?: string; message?: string };
      setError(e?.error || e?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, sortOption]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSortChange = (value: string) => {
    const option = ADMIN_SORT_OPTIONS.find(
      (opt) => `${opt.field}-${opt.order}` === value
    );
    if (option) {
      setSortOption(option);
      setCurrentPage(1);
    }
  };

  const handleTabChange = (tab: OrderTab) => {
    setCurrentPage(1);
    if (tab === 'all') {
      router.push('/admin/orders');
    } else {
      router.push(`/admin/orders?tab=${tab}`);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    setError('');

    try {
      await apiClient.put(`/orders/${orderId}/status`, { status: newStatus });

      // Refresh orders to reflect the change (order may move to different tab)
      fetchOrders();
    } catch (err: unknown) {
      const e = err as { error?: string; message?: string };
      setError(e?.error || e?.message || 'Failed to update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getStatusColor = (status: OrderStatus): string => {
    const colors: Record<OrderStatus, string> = {
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50',
      confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
      payment_confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
      printing: 'bg-purple-500/10 text-purple-500 border-purple-500/50',
      shipped: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/50',
      delivered: 'bg-green-500/10 text-green-500 border-green-500/50',
      cancellation_requested: 'bg-amber-500/10 text-amber-500 border-amber-500/50',
      cancelled: 'bg-red-500/10 text-red-500 border-red-500/50',
      refunded: 'bg-orange-500/10 text-orange-500 border-orange-500/50',
    };
    return colors[status];
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const workflow: Record<OrderStatus, OrderStatus | null> = {
      pending: 'payment_confirmed',
      confirmed: 'printing',
      payment_confirmed: 'printing',
      printing: 'shipped',
      shipped: 'delivered',
      delivered: null,
      cancellation_requested: null,
      cancelled: null,
      refunded: null,
    };
    return workflow[currentStatus];
  };

  const getEmptyMessage = (tab: OrderTab): { title: string; description: string } => {
    switch (tab) {
      case 'in_progress':
        return {
          title: 'No orders in progress',
          description: 'Orders being prepared or awaiting payment will appear here.',
        };
      case 'shipped':
        return {
          title: 'No shipped orders',
          description: 'Orders currently in transit will appear here.',
        };
      case 'completed':
        return {
          title: 'No completed orders',
          description: 'Successfully delivered orders will appear here.',
        };
      case 'cancelled':
        return {
          title: 'No cancelled orders',
          description: 'Cancelled or refunded orders will appear here.',
        };
      default:
        return {
          title: 'No orders yet',
          description: 'Orders will appear here when customers place them.',
        };
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

        {/* Tab Navigation and Sort */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2 flex-wrap overflow-x-auto pb-2">
            {ORDER_TABS.map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleTabChange(tab)}
                className={activeTab === tab ? 'btn-gradient' : ''}
              >
                {ORDER_TAB_LABELS[tab]}
              </Button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <Select
              value={`${sortOption.field}-${sortOption.order}`}
              onValueChange={handleSortChange}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {ADMIN_SORT_OPTIONS.map((opt) => (
                  <SelectItem key={`${opt.field}-${opt.order}`} value={`${opt.field}-${opt.order}`}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-md h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading orders...</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <Card className="card-glow">
            <CardContent className="py-20 text-center">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {getEmptyMessage(activeTab).title}
              </h3>
              <p className="text-muted-foreground">
                {getEmptyMessage(activeTab).description}
              </p>
              {activeTab !== 'all' && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => handleTabChange('all')}
                >
                  View All Orders
                </Button>
              )}
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
                          <div className="w-24 h-24 bg-card/30 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 relative">
                            <Image
                              src={
                                order.previewUrl || order.design.previewUrl || order.design.imageUrl
                              }
                              alt={order.design.name}
                              fill
                              className="object-contain"
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
                            {order.material && (
                              <div>
                                <p className="text-muted-foreground">Material</p>
                                <p className="font-medium">{MATERIAL_LABELS[order.material] || order.material}</p>
                              </div>
                            )}
                            {order.printSize && (
                              <div>
                                <p className="text-muted-foreground">Size</p>
                                <p className="font-medium">{PRINT_SIZE_LABELS[order.printSize] || order.printSize}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-muted-foreground">Price</p>
                              <p className="font-medium text-primary">
                                £{Number(order.totalPrice).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Order Date</p>
                              <p className="font-medium">
                                {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                            <Badge
                              className={`${getStatusColor(order.status)} border px-3 py-1 w-full justify-center`}
                            >
                              {ORDER_STATUS_LABELS[order.status]}
                            </Badge>

                            {nextStatus && (
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => handleUpdateStatus(order.id, nextStatus)}
                                disabled={isUpdating}
                              >
                                {isUpdating ? 'Updating...' : `Mark as ${ORDER_STATUS_LABELS[nextStatus]}`}
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

function AdminOrdersWithSuspense() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-md h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <AdminOrdersContent />
    </Suspense>
  );
}

export default function AdminOrdersPage() {
  return (
    <ProtectedRoute>
      <AdminOrdersWithSuspense />
    </ProtectedRoute>
  );
}
