'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins } from 'lucide-react';
import Link from 'next/link';
import { ordersService } from '@/lib/api/orders';
import { designsService } from '@/lib/api/designs';
import apiClient from '@/lib/api/client';
import { PendingReviewsBanner } from '@/components/reviews';
import { getUserPoints } from '@/lib/api/points';
import { createLogger } from '@/lib/logger';

const logger = createLogger('dashboard');

function DashboardContent() {
  const { user } = useAuth();
  const [totalOrders, setTotalOrders] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [activeDesigns, setActiveDesigns] = useState(0);
  const [unreadIssues, setUnreadIssues] = useState(0);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [pointsValue, setPointsValue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch orders
        const ordersResponse = await ordersService.list(1, 1);
        setTotalOrders(ordersResponse.pagination.total);

        // Fetch pending orders (all active orders)
        try {
          const activeResponse = await ordersService.list(1, 1, { archived: false });
          setPendingOrders(activeResponse.pagination.total);
        } catch {
          setPendingOrders(0);
        }

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

        // Fetch loyalty points
        try {
          const pointsData = await getUserPoints();
          setLoyaltyPoints(pointsData.points);
          setPointsValue(pointsData.discountValue);
        } catch {
          // Points endpoint might fail
        }
      } catch (error) {
        logger.error('Failed to fetch dashboard data', { error: error instanceof Error ? error.message : String(error) });
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

        {/* Pending Reviews Banner */}
        <PendingReviewsBanner />

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg">Total Orders</CardTitle>
              <CardDescription>All time</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-10 w-16 bg-primary/20 rounded animate-pulse" />
              ) : (
                <p className="text-4xl font-bold text-primary">{totalOrders}</p>
              )}
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg">Active Designs</CardTitle>
              <CardDescription>Ready to print</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-10 w-12 bg-secondary/20 rounded animate-pulse" />
              ) : (
                <p className="text-4xl font-bold text-secondary">{activeDesigns}</p>
              )}
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="text-lg">Pending Orders</CardTitle>
              <CardDescription>In progress</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-10 w-12 bg-accent/20 rounded animate-pulse" />
              ) : (
                <p className="text-4xl font-bold text-accent">{pendingOrders}</p>
              )}
            </CardContent>
          </Card>

          <Link href="/account/points" className="block">
            <Card className="card-glow hover:border-yellow-500/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-500" />
                  Loyalty Points
                </CardTitle>
                <CardDescription>Worth {'\u00A3'}{pointsValue.toFixed(2)} off</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-10 w-16 bg-yellow-500/20 rounded animate-pulse" />
                ) : (
                  <p className="text-4xl font-bold text-yellow-600">{loyaltyPoints}</p>
                )}
              </CardContent>
            </Card>
          </Link>
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
            <Link href="/account/wishlist">
              <Button variant="outline">Favorites</Button>
            </Link>
            <Link href="/account/points">
              <Button variant="outline" className="border-yellow-500/50 text-yellow-600 hover:text-yellow-700">
                <Coins className="w-4 h-4 mr-2" />
                Points History
              </Button>
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
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
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
