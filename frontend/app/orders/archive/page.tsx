'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ordersService, Order, OrderStatus, ORDER_STATUS_LABELS, ARCHIVED_ORDER_STATUSES } from '@/lib/api/orders';
import { MATERIAL_LABELS, PRINT_SIZE_LABELS } from '@/lib/api/designs';
import Link from 'next/link';
import { ArrowLeft, ArrowUpDown } from 'lucide-react';

type SortOption = 'date_desc' | 'date_asc' | 'total_desc' | 'total_asc' | 'status';

function OrderArchiveContent() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, currentPage]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await ordersService.list(currentPage, 10, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        archived: true, // Only show archived orders
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

  // Sort orders client-side
  const sortedOrders = [...orders].sort((a, b) => {
    switch (sortBy) {
      case 'date_desc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'date_asc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'total_desc':
        return Number(b.totalPrice) - Number(a.totalPrice);
      case 'total_asc':
        return Number(a.totalPrice) - Number(b.totalPrice);
      case 'status':
        return a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });

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

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/orders">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Active Orders
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Order Archive</span>
            </h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/products">
              <Button variant="outline" size="sm">Continue Shopping</Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Filter and Sort Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
          {/* Status Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className={statusFilter === 'all' ? 'btn-gradient' : ''}
            >
              All Archived
            </Button>
            <Button
              variant={statusFilter === 'delivered' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatusFilter('delivered');
                setCurrentPage(1);
              }}
              className={statusFilter === 'delivered' ? 'bg-green-500 hover:bg-green-600' : ''}
            >
              Delivered
            </Button>
            <Button
              variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatusFilter('cancelled');
                setCurrentPage(1);
              }}
              className={statusFilter === 'cancelled' ? 'bg-red-500 hover:bg-red-600' : ''}
            >
              Cancelled
            </Button>
            <Button
              variant={statusFilter === 'refunded' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatusFilter('refunded');
                setCurrentPage(1);
              }}
              className={statusFilter === 'refunded' ? 'bg-orange-500 hover:bg-orange-600' : ''}
            >
              Refunded
            </Button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Newest First</SelectItem>
                <SelectItem value="date_asc">Oldest First</SelectItem>
                <SelectItem value="total_desc">Highest Total</SelectItem>
                <SelectItem value="total_asc">Lowest Total</SelectItem>
                <SelectItem value="status">By Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-md h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading archived orders...</p>
            </div>
          </div>
        ) : sortedOrders.length === 0 ? (
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
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {statusFilter === 'all' ? 'No archived orders' : `No ${ORDER_STATUS_LABELS[statusFilter] || statusFilter} orders`}
              </h3>
              <p className="text-muted-foreground mb-6">
                {statusFilter === 'all'
                  ? 'Completed, cancelled, and refunded orders will appear here.'
                  : 'Try selecting a different filter to see other orders.'}
              </p>
              <Link href="/orders">
                <Button variant="outline">View Active Orders</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedOrders.map((order) => (
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
                            {order.design?.name || 'Order'}
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
                          <p className="text-muted-foreground">Total</p>
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

                      {order.refundAmount && (
                        <div className="pt-2">
                          <p className="text-sm text-orange-500">
                            Refunded: £{Number(order.refundAmount).toFixed(2)}
                          </p>
                        </div>
                      )}

                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground">
                          Shipped to: {order.shippingAddress.name}, {order.shippingAddress.city},{' '}
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

export default function OrderArchivePage() {
  return (
    <ProtectedRoute>
      <OrderArchiveContent />
    </ProtectedRoute>
  );
}
