'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ordersService, Order, OrderStatus, ORDER_STATUS_LABELS } from '@/lib/api/orders';
import { MATERIAL_LABELS, PRINT_SIZE_LABELS } from '@/lib/api/designs';
import apiClient from '@/lib/api/client';
import Link from 'next/link';

function AdminDashboardContent() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    printingOrders: 0,
    shippedOrders: 0,
  });
  const [pendingIssues, setPendingIssues] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirect if not admin
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch recent orders
      const ordersData = await ordersService.list(1, 10);
      setRecentOrders(ordersData.orders);

      // Calculate stats
      const pending = ordersData.orders.filter(
        (o) => o.status === 'pending' || o.status === 'payment_confirmed'
      ).length;
      const printing = ordersData.orders.filter((o) => o.status === 'printing').length;
      const shipped = ordersData.orders.filter(
        (o) => o.status === 'shipped' || o.status === 'delivered'
      ).length;

      setStats({
        totalOrders: ordersData.pagination.total,
        pendingOrders: pending,
        printingOrders: printing,
        shippedOrders: shipped,
      });

      // Fetch pending issues count from new issues endpoint
      try {
        const issuesData = await apiClient.get<{ stats: { pending: number; infoRequested: number } }>('/admin/issues');
        // Count pending as: AWAITING_REVIEW + INFO_REQUESTED (issues needing attention)
        const pendingCount = (issuesData.data?.stats?.pending || 0) + (issuesData.data?.stats?.infoRequested || 0);
        setPendingIssues(pendingCount);
      } catch {
        // Silently fail - issues count is not critical
      }
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
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
      cancelled: 'bg-red-500/10 text-red-500 border-red-500/50',
      refunded: 'bg-orange-500/10 text-orange-500 border-orange-500/50',
    };
    return colors[status];
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Logout failed silently - user can try again
    }
  };

  if (user && user.userType !== 'PRINTER_ADMIN') {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                ← Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Admin Dashboard</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-right">
              <p className="text-foreground font-medium">{user?.name}</p>
              <Badge variant="destructive" className="text-xs">
                Admin
              </Badge>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
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

        {/* Stats Overview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg">Total Orders</CardTitle>
              <CardDescription>All time</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">{stats.totalOrders}</p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg">Pending</CardTitle>
              <CardDescription>Awaiting processing</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-yellow-500">{stats.pendingOrders}</p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg">Printing</CardTitle>
              <CardDescription>In production</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-purple-500">{stats.printingOrders}</p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg">Shipped</CardTitle>
              <CardDescription>Delivered or in transit</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-green-500">{stats.shippedOrders}</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="card-glow mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your print business</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Link href="/admin/orders">
              <Button className="btn-gradient">Manage Orders</Button>
            </Link>
            <Link href="/admin/products">
              <Button variant="outline">Manage Products</Button>
            </Link>
            <Link href="/admin/categories">
              <Button variant="outline">Manage Categories</Button>
            </Link>
            <Link href="/admin/shipping">
              <Button variant="outline">Shipping & Labels</Button>
            </Link>
            <Link href="/admin/returns">
              <Button variant="outline" className="border-orange-500/50 text-orange-500 hover:text-orange-600 relative">
                Issues & Returns
                {pendingIssues > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {pendingIssues > 9 ? '9+' : pendingIssues}
                  </span>
                )}
              </Button>
            </Link>
            <Link href="/admin/customers">
              <Button variant="outline">View Customers</Button>
            </Link>
            <Link href="/admin/subscribers">
              <Button variant="outline">Subscribers</Button>
            </Link>
            <Link href="/admin/promos">
              <Button variant="outline">Promo Codes</Button>
            </Link>
            <Link href="/admin/campaigns">
              <Button variant="outline">Email Campaigns</Button>
            </Link>
            <Button variant="outline" disabled>
              Reports (Coming Soon)
            </Button>
            <Button variant="outline" disabled>
              Settings (Coming Soon)
            </Button>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="card-glow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest customer orders</CardDescription>
              </div>
              <Link href="/admin/orders">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-md h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading orders...</p>
                </div>
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center gap-4 p-4 bg-card/30 rounded-lg hover:bg-card/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                  >
                    {/* Order Image */}
                    {order.design && (
                      <div className="w-16 h-16 bg-card/30 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
                        <img
                          src={order.previewUrl || order.design.previewUrl || order.design.imageUrl}
                          alt={order.design.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    )}

                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{order.design?.name || 'Design'}</h4>
                      <p className="text-sm text-muted-foreground">
                        {order.shippingAddress.name} • £{Number(order.totalPrice).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <Badge className={`${getStatusColor(order.status)} border px-3 py-1`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </Badge>
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

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
