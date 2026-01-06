'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  ShoppingCart,
  Heart,
  Mail,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  PoundSterling,
  TrendingUp,
} from 'lucide-react';
import apiClient from '@/lib/api/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('admin-recovery-campaigns');

interface Campaign {
  id: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  type: 'CART' | 'WISHLIST';
  status: 'PENDING' | 'SENT' | 'CONVERTED' | 'EXPIRED' | 'CANCELLED';
  itemCount: number;
  totalValue: number | null;
  promoCode: string | null;
  discountPercent: number | null;
  emailSentAt: string | null;
  convertedAt: string | null;
  recoveredRevenue: number | null;
  createdAt: string;
  expiresAt: string;
}

interface Stats {
  period: string;
  summary: {
    totalSent: number;
    totalConverted: number;
    totalPending: number;
    conversionRate: number;
    revenueRecovered: number;
  };
  byType: Record<string, number>;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  SENT: { label: 'Sent', color: 'bg-blue-100 text-blue-800', icon: Mail },
  CONVERTED: { label: 'Converted', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  EXPIRED: { label: 'Expired', color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
};

function AdminRecoveryCampaignsContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [isPaused, setIsPaused] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);

  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('type', typeFilter);

      const response = await apiClient.get(`/admin/recovery-campaigns?${params}`);
      setCampaigns(response.data.data.campaigns);
      setTotalPages(response.data.data.pagination.totalPages);
    } catch (err) {
      setError('Failed to load campaigns');
      logger.error('Failed to load campaigns', { error: String(err) });
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, typeFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/admin/recovery-campaigns/stats?days=30');
      setStats(response.data.data);
    } catch (err) {
      logger.error('Failed to load stats', { error: String(err) });
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await apiClient.get('/admin/recovery-campaigns/settings');
      setIsPaused(response.data.data.isPaused);
    } catch (err) {
      logger.error('Failed to load settings', { error: String(err) });
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchStats();
    fetchSettings();
  }, [fetchCampaigns, fetchStats, fetchSettings]);

  const handleTogglePause = async () => {
    try {
      setTogglingPause(true);
      await apiClient.patch('/admin/recovery-campaigns/settings', { isPaused: !isPaused });
      setIsPaused(!isPaused);
    } catch (err) {
      logger.error('Failed to toggle pause', { error: String(err) });
    } finally {
      setTogglingPause(false);
    }
  };

  const handleCancelCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this campaign?')) return;

    try {
      await apiClient.patch(`/admin/recovery-campaigns/${id}`, { action: 'cancel' });
      fetchCampaigns();
    } catch (err) {
      logger.error('Failed to cancel campaign', { error: String(err) });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Recovery Campaigns</h1>
            <p className="text-muted-foreground mt-1">
              Automated cart and wishlist recovery with promo codes
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Automation</span>
              <Switch
                checked={!isPaused}
                onCheckedChange={handleTogglePause}
                disabled={togglingPause}
              />
              <Badge variant={isPaused ? 'destructive' : 'default'}>
                {isPaused ? 'Paused' : 'Active'}
              </Badge>
            </div>
            <Button variant="outline" onClick={() => { fetchCampaigns(); fetchStats(); }} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Emails Sent</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-500" />
                  {stats.summary.totalSent}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Converted</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  {stats.summary.totalConverted}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Conversion Rate</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                  {stats.summary.conversionRate}%
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pending</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  {stats.summary.totalPending}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Revenue Recovered</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <PoundSterling className="h-5 w-5 text-green-500" />
                  {formatCurrency(stats.summary.revenueRecovered)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4 flex-wrap">
              <select
                className="border rounded-md px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="SENT">Sent</option>
                <option value="CONVERTED">Converted</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <select
                className="border rounded-md px-3 py-2 text-sm"
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Types</option>
                <option value="CART">Cart</option>
                <option value="WISHLIST">Wishlist</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns Table */}
        <Card>
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>{stats?.period || 'All time'}</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <p className="text-destructive mb-4">{error}</p>}

            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No campaigns found</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 text-sm font-medium">User</th>
                        <th className="text-left py-3 px-2 text-sm font-medium">Type</th>
                        <th className="text-left py-3 px-2 text-sm font-medium">Items</th>
                        <th className="text-left py-3 px-2 text-sm font-medium">Promo</th>
                        <th className="text-left py-3 px-2 text-sm font-medium">Status</th>
                        <th className="text-left py-3 px-2 text-sm font-medium">Revenue</th>
                        <th className="text-left py-3 px-2 text-sm font-medium">Created</th>
                        <th className="text-left py-3 px-2 text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.map((campaign) => {
                        const statusInfo = statusConfig[campaign.status];
                        const StatusIcon = statusInfo.icon;
                        return (
                          <tr key={campaign.id} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-2">
                              <div>
                                <p className="font-medium text-sm">{campaign.user.name}</p>
                                <p className="text-xs text-muted-foreground">{campaign.user.email}</p>
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant="outline" className="gap-1">
                                {campaign.type === 'CART' ? (
                                  <ShoppingCart className="h-3 w-3" />
                                ) : (
                                  <Heart className="h-3 w-3" />
                                )}
                                {campaign.type}
                              </Badge>
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-sm">
                                {campaign.itemCount} items
                                {campaign.totalValue && ` (${formatCurrency(campaign.totalValue)})`}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              {campaign.promoCode ? (
                                <code className="text-xs bg-muted px-2 py-1 rounded">{campaign.promoCode}</code>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-3 px-2">
                              <Badge className={`${statusInfo.color} gap-1`}>
                                <StatusIcon className="h-3 w-3" />
                                {statusInfo.label}
                              </Badge>
                            </td>
                            <td className="py-3 px-2">
                              {campaign.recoveredRevenue ? (
                                <span className="text-green-600 font-medium">
                                  {formatCurrency(campaign.recoveredRevenue)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-sm text-muted-foreground">
                              {formatDate(campaign.createdAt)}
                            </td>
                            <td className="py-3 px-2">
                              {['PENDING', 'SENT'].includes(campaign.status) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelCampaign(campaign.id)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="px-4 py-2 text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminRecoveryCampaignsPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminRecoveryCampaignsContent />
    </ProtectedRoute>
  );
}
