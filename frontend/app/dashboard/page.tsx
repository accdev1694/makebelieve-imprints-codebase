'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ordersService } from '@/lib/api/orders';
import { designsService } from '@/lib/api/designs';
import apiClient from '@/lib/api/client';

function DashboardContent() {
  const { user } = useAuth();
  const [totalOrders, setTotalOrders] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [activeDesigns, setActiveDesigns] = useState(0);
  const [unreadIssues, setUnreadIssues] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch orders
        const ordersResponse = await ordersService.list(1, 1);
        setTotalOrders(ordersResponse.pagination.total);

        // Fetch pending orders (pending + confirmed + printing statuses)
        const pendingStatuses = ['pending', 'confirmed', 'payment_confirmed', 'printing'];
        let pendingCount = 0;
        for (const status of pendingStatuses) {
          try {
            const pendingResponse = await ordersService.list(1, 1, status as 'pending' | 'confirmed' | 'printing');
            pendingCount += pendingResponse.pagination.total;
          } catch {
            // Status might not exist or no orders with that status
          }
        }
        setPendingOrders(pendingCount);

        // Fetch designs
        const designs = await designsService.list();
        setActiveDesigns(designs.length);

        // Fetch unread issues count
        try {
          const issuesResponse = await apiClient.get<{ stats: { unreadMessages: number } }>('/issues');
          setUnreadIssues(issuesResponse.data?.stats?.unreadMessages || 0);
        } catch {
          // Issues endpoint might fail if no issues exist
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, <span className="text-primary">{user?.name}</span>!
          </h2>
          <p className="text-muted-foreground">
            Manage your designs, orders, and account settings
          </p>
          <div className="mt-4">
            <Badge variant={user?.userType === 'PRINTER_ADMIN' ? 'destructive' : 'default'}>
              {user?.userType === 'PRINTER_ADMIN' ? 'Admin' : 'Customer'}
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg">Total Orders</CardTitle>
              <CardDescription>All time</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">
                {loading ? '...' : totalOrders}
              </p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg">Active Designs</CardTitle>
              <CardDescription>Ready to print</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-secondary">
                {loading ? '...' : activeDesigns}
              </p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg">Pending Orders</CardTitle>
              <CardDescription>In progress</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-accent">
                {loading ? '...' : pendingOrders}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Link href="/design/new">
              <Button className="btn-gradient">Create New Design</Button>
            </Link>
            <Link href="/design/my-designs">
              <Button variant="outline">My Designs</Button>
            </Link>
            <Link href="/orders">
              <Button variant="outline">View Orders</Button>
            </Link>
            <Link href="/account/issues">
              <Button variant="outline" className="relative">
                My Issues
                {unreadIssues > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {unreadIssues > 9 ? '9+' : unreadIssues}
                  </span>
                )}
              </Button>
            </Link>
            <Link href="/products">
              <Button variant="outline">Browse Products</Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline">Account Settings</Button>
            </Link>
            {user?.userType === 'PRINTER_ADMIN' && (
              <Link href="/admin">
                <Button variant="secondary">Admin Panel</Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="card-glow mt-6">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Account Type</p>
                <p className="font-medium">{user?.userType === 'PRINTER_ADMIN' ? 'Admin' : 'Customer'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-medium">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-medium text-xs">{user?.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
