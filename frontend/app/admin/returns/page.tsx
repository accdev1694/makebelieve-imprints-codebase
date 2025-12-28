'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api/client';
import Link from 'next/link';

interface Resolution {
  id: string;
  orderId: string;
  type: 'REPRINT' | 'REFUND';
  reason: string;
  notes: string | null;
  reprintOrderId: string | null;
  refundAmount: number | null;
  stripeRefundId: string | null;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  processedAt: string | null;
  order: {
    id: string;
    totalPrice: number | string;
    status: string;
    createdAt: string;
    shippingAddress: { name: string };
    customer: {
      id: string;
      name: string;
      email: string;
    };
  };
}

const REASON_LABELS: Record<string, string> = {
  DAMAGED_IN_TRANSIT: 'Damaged in Transit',
  QUALITY_ISSUE: 'Quality Issue',
  WRONG_ITEM: 'Wrong Item Sent',
  PRINTING_ERROR: 'Printing Error',
  OTHER: 'Other',
};

function ReturnsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'REPRINT' | 'REFUND'>('all');

  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    fetchResolutions();
  }, []);

  const fetchResolutions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ resolutions: Resolution[] }>('/admin/resolutions');
      setResolutions(response.data?.resolutions || []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setError(error?.response?.data?.error || error?.message || 'Failed to load resolutions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Resolution['status']): string => {
    const colors: Record<Resolution['status'], string> = {
      PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50',
      PROCESSING: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
      COMPLETED: 'bg-green-500/10 text-green-500 border-green-500/50',
      FAILED: 'bg-red-500/10 text-red-500 border-red-500/50',
    };
    return colors[status];
  };

  const getTypeColor = (type: Resolution['type']): string => {
    return type === 'REPRINT'
      ? 'bg-purple-500/10 text-purple-500 border-purple-500/50'
      : 'bg-orange-500/10 text-orange-500 border-orange-500/50';
  };

  const filteredResolutions = filter === 'all'
    ? resolutions
    : resolutions.filter((r) => r.type === filter);

  const stats = {
    total: resolutions.length,
    reprints: resolutions.filter((r) => r.type === 'REPRINT').length,
    refunds: resolutions.filter((r) => r.type === 'REFUND').length,
    pending: resolutions.filter((r) => r.status === 'PENDING' || r.status === 'PROCESSING').length,
  };

  if (user && user.userType !== 'PRINTER_ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                ← Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">Issues & Returns</span>
            </h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardDescription>Total Resolutions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardDescription>Reprints</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-500">{stats.reprints}</p>
            </CardContent>
          </Card>
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardDescription>Refunds</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-500">{stats.refunds}</p>
            </CardContent>
          </Card>
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-500">{stats.pending}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'REPRINT' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('REPRINT')}
            className={filter === 'REPRINT' ? '' : 'text-purple-500 border-purple-500/50'}
          >
            Reprints
          </Button>
          <Button
            variant={filter === 'REFUND' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('REFUND')}
            className={filter === 'REFUND' ? '' : 'text-orange-500 border-orange-500/50'}
          >
            Refunds
          </Button>
        </div>

        {/* Resolutions List */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle>Resolution History</CardTitle>
            <CardDescription>All reprints and refunds issued</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-md h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              </div>
            ) : filteredResolutions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No resolutions found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Resolutions are created from the order details page when handling customer issues.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredResolutions.map((resolution) => (
                  <div
                    key={resolution.id}
                    className="p-4 bg-card/30 rounded-lg hover:bg-card/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${getTypeColor(resolution.type)} border`}>
                            {resolution.type}
                          </Badge>
                          <Badge className={`${getStatusColor(resolution.status)} border`}>
                            {resolution.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(resolution.createdAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm">
                              <span className="text-muted-foreground">Customer:</span>{' '}
                              <span className="font-medium">{resolution.order.customer.name}</span>
                            </p>
                            <p className="text-sm">
                              <span className="text-muted-foreground">Email:</span>{' '}
                              {resolution.order.customer.email}
                            </p>
                            <p className="text-sm">
                              <span className="text-muted-foreground">Reason:</span>{' '}
                              {REASON_LABELS[resolution.reason] || resolution.reason}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm">
                              <span className="text-muted-foreground">Original Order:</span>{' '}
                              <Link
                                href={`/admin/orders/${resolution.orderId}`}
                                className="text-primary hover:underline font-mono"
                              >
                                {resolution.orderId.slice(0, 8).toUpperCase()}
                              </Link>
                              {' '}(£{Number(resolution.order.totalPrice).toFixed(2)})
                            </p>
                            {resolution.reprintOrderId && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">Reprint Order:</span>{' '}
                                <Link
                                  href={`/admin/orders/${resolution.reprintOrderId}`}
                                  className="text-primary hover:underline font-mono"
                                >
                                  {resolution.reprintOrderId.slice(0, 8).toUpperCase()}
                                </Link>
                              </p>
                            )}
                            {resolution.refundAmount && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">Refund Amount:</span>{' '}
                                <span className="font-medium text-green-500">
                                  £{Number(resolution.refundAmount).toFixed(2)}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>

                        {resolution.notes && (
                          <p className="text-sm mt-2 text-muted-foreground italic">
                            Notes: {resolution.notes}
                          </p>
                        )}
                      </div>

                      <Link href={`/admin/orders/${resolution.orderId}`}>
                        <Button variant="outline" size="sm">
                          View Order
                        </Button>
                      </Link>
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

export default function ReturnsPage() {
  return (
    <ProtectedRoute>
      <ReturnsContent />
    </ProtectedRoute>
  );
}
