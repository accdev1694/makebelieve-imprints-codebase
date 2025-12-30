'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Mail, Users, UserCheck, UserX, Search, Download, MoreVertical, CheckCircle, Trash2 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  status: 'PENDING' | 'ACTIVE' | 'UNSUBSCRIBED';
  source: 'FOOTER' | 'CHECKOUT' | 'POPUP' | 'ADMIN';
  subscribedAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
}

interface SubscribersResponse {
  subscribers: Subscriber[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    active: number;
    pending: number;
    unsubscribed: number;
    total: number;
  };
}

function AdminSubscribersContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState({ active: 0, pending: 0, unsubscribed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Redirect if not admin
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    fetchSubscribers();
  }, [currentPage, statusFilter]);

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '20');
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/subscribers?${params.toString()}`);
      const data: SubscribersResponse = await response.json();

      if (!response.ok) {
        throw new Error('Failed to load subscribers');
      }

      setSubscribers(data.subscribers);
      setTotalPages(data.pagination.totalPages);
      setStats(data.stats);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load subscribers';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchSubscribers();
  };

  const exportSubscribers = async () => {
    try {
      const response = await fetch('/api/subscribers?limit=10000&status=ACTIVE');
      const data: SubscribersResponse = await response.json();

      if (!response.ok) {
        throw new Error('Failed to export subscribers');
      }

      // Create CSV
      const csv = [
        ['Email', 'Name', 'Status', 'Subscribed Date'].join(','),
        ...data.subscribers.map((s) =>
          [
            s.email,
            s.name || '',
            s.status,
            s.subscribedAt ? new Date(s.subscribedAt).toISOString() : '',
          ].join(',')
        ),
      ].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export subscribers');
    }
  };

  const activateSubscriber = async (id: string) => {
    try {
      const response = await fetch(`/api/subscribers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to activate subscriber');
      }

      fetchSubscribers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to activate subscriber';
      setError(message);
    }
  };

  const deleteSubscriber = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscriber?')) return;

    try {
      const response = await fetch(`/api/subscribers/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete subscriber');
      }

      fetchSubscribers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete subscriber';
      setError(message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case 'UNSUBSCRIBED':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Unsubscribed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
              <span className="text-neon-gradient">Subscriber Management</span>
            </h1>
          </div>
          <Button onClick={exportSubscribers} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Subscribers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Active
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-400">{stats.active}</p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Pending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
            </CardContent>
          </Card>

          <Card className="card-glow">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <UserX className="h-4 w-4" />
                Unsubscribed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-400">{stats.unsubscribed}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="card-glow mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by email or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>
                <Button type="submit" variant="outline">
                  Search
                </Button>
              </form>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-2 rounded-lg border border-border bg-background text-foreground"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="UNSUBSCRIBED">Unsubscribed</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Subscriber List */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle>All Subscribers</CardTitle>
            <CardDescription>Manage your email subscriber list</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading subscribers...</p>
                </div>
              </div>
            ) : subscribers.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No subscribers found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subscribers.map((subscriber) => (
                  <div
                    key={subscriber.id}
                    className="flex items-center justify-between p-4 bg-card/30 rounded-lg hover:bg-card/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold">{subscriber.email}</h4>
                        {getStatusBadge(subscriber.status)}
                      </div>
                      {subscriber.name && (
                        <p className="text-sm text-muted-foreground">{subscriber.name}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {subscriber.status === 'ACTIVE' && subscriber.subscribedAt
                          ? `Subscribed ${new Date(subscriber.subscribedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                          : subscriber.status === 'UNSUBSCRIBED' && subscriber.unsubscribedAt
                          ? `Unsubscribed ${new Date(subscriber.unsubscribedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                          : `Added ${new Date(subscriber.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                      </p>
                    </div>

                    {/* Actions */}
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          className="z-50 min-w-[160px] bg-popover border border-border rounded-lg p-1 shadow-lg"
                          align="end"
                        >
                          {subscriber.status !== 'ACTIVE' && (
                            <DropdownMenu.Item
                              className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer outline-none hover:bg-accent text-green-500"
                              onSelect={() => activateSubscriber(subscriber.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                              Activate
                            </DropdownMenu.Item>
                          )}
                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md cursor-pointer outline-none hover:bg-destructive/10 text-destructive"
                            onSelect={() => deleteSubscriber(subscriber.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6 mt-6 border-t border-border">
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function AdminSubscribersPage() {
  return (
    <ProtectedRoute>
      <AdminSubscribersContent />
    </ProtectedRoute>
  );
}
