'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
} from '@/lib/api/orders';
import { MATERIAL_LABELS, PRINT_SIZE_LABELS } from '@/lib/api/designs';
import Link from 'next/link';

const ORDER_TABS: OrderTab[] = ['all', 'in_progress', 'shipped', 'completed', 'cancelled'];

function OrderHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Get active tab from URL or default to 'all'
  const activeTab = (searchParams.get('tab') as OrderTab) || 'all';

  useEffect(() => {
    fetchOrders();
  }, [activeTab, currentPage]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await ordersService.list(currentPage, 10, {
        tab: activeTab,
      });
      setOrders(data.orders);
      setTotalPages(data.pagination.totalPages);
    } catch (err: unknown) {
      const e = err as { error?: string; message?: string };
      setError(e?.error || e?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: OrderTab) => {
    setCurrentPage(1);
    if (tab === 'all') {
      router.push('/orders');
    } else {
      router.push(`/orders?tab=${tab}`);
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
          description: 'Orders on their way to you will appear here.',
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
          description: "When you place an order, it will appear here.",
        };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                ← Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Your Orders</span>
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/products">
              <Button variant="outline" size="sm">Continue Shopping</Button>
            </Link>
            <Link href="/design/new">
              <Button className="btn-gradient" size="sm">Create New Design</Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6 flex gap-2 flex-wrap overflow-x-auto pb-2">
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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-md h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading your orders...</p>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <Card className="card-glow">
            <CardContent className="py-20 text-center">
              <div className="mb-6">
                <svg
                  className="mx-auto w-16 h-16 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {getEmptyMessage(activeTab).title}
              </h3>
              <p className="text-muted-foreground mb-6">
                {getEmptyMessage(activeTab).description}
              </p>
              <div className="flex gap-3 justify-center">
                {activeTab !== 'all' && (
                  <Button variant="outline" onClick={() => handleTabChange('all')}>
                    View All Orders
                  </Button>
                )}
                <Link href="/products">
                  <Button className="btn-gradient">Start Shopping</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="card-glow hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                onClick={() => router.push(`/orders/${order.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Order Image */}
                    {order.design && (
                      <div className="w-full md:w-32 h-32 bg-card/30 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                        <img
                          src={order.previewUrl || order.design.previewUrl || order.design.imageUrl}
                          alt={order.design.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    )}

                    {/* Order Details */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {order.design?.name || 'Design'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Order #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                        <Badge className={`${getStatusColor(order.status)} border px-3 py-1`}>
                          {ORDER_STATUS_LABELS[order.status]}
                        </Badge>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
                          <p className="font-medium text-primary">£{Number(order.totalPrice).toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Order Date</p>
                          <p className="font-medium">
                            {new Date(order.createdAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>

                      {order.trackingNumber && (
                        <div className="pt-2">
                          <p className="text-xs text-muted-foreground mb-1">Tracking Number:</p>
                          <p className="font-mono text-sm">{order.trackingNumber}</p>
                        </div>
                      )}

                      {order.refundAmount && (
                        <div className="pt-2">
                          <p className="text-sm text-orange-500">
                            Refunded: £{Number(order.refundAmount).toFixed(2)}
                          </p>
                        </div>
                      )}

                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground">
                          Shipping to: {order.shippingAddress.name}, {order.shippingAddress.city},{' '}
                          {order.shippingAddress.postcode}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

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

function OrderHistoryWithSuspense() {
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
      <OrderHistoryContent />
    </Suspense>
  );
}

export default function OrderHistoryPage() {
  return (
    <ProtectedRoute>
      <OrderHistoryWithSuspense />
    </ProtectedRoute>
  );
}
