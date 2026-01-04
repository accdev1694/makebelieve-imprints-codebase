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
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, MessageSquare, Truck } from 'lucide-react';

type IssueStatus =
  | 'SUBMITTED'
  | 'AWAITING_REVIEW'
  | 'INFO_REQUESTED'
  | 'APPROVED_REPRINT'
  | 'APPROVED_REFUND'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CLOSED';

interface Issue {
  id: string;
  reason: string;
  status: IssueStatus;
  carrierFault: 'UNKNOWN' | 'CARRIER_FAULT' | 'NOT_CARRIER_FAULT';
  initialNotes: string | null;
  imageUrls: string[] | null;
  resolvedType: 'REPRINT' | 'FULL_REFUND' | 'PARTIAL_REFUND' | null;
  reprintOrderId: string | null;
  refundAmount: number | null;
  rejectionReason: string | null;
  createdAt: string;
  processedAt: string | null;
  orderItem: {
    id: string;
    quantity: number;
    totalPrice: number | string;
    order: {
      id: string;
      status: string;
      createdAt: string;
      trackingNumber: string | null;
      carrier: string | null;
      shippingAddress: {
        name: string;
        city: string;
        country: string;
      };
      customer: {
        id: string;
        name: string;
        email: string;
      };
    };
    product: {
      id: string;
      name: string;
    } | null;
    variant: {
      id: string;
      name: string;
    } | null;
  };
  unreadCount: number;
}

interface IssueStats {
  total: number;
  pending: number;
  infoRequested: number;
  approved: number;
  processing: number;
  resolved: number;
  rejected: number;
  carrierFault: number;
}

const REASON_LABELS: Record<string, string> = {
  DAMAGED_IN_TRANSIT: 'Damaged in Transit',
  QUALITY_ISSUE: 'Quality Issue',
  WRONG_ITEM: 'Wrong Item Sent',
  PRINTING_ERROR: 'Printing Error',
  NEVER_ARRIVED: 'Never Arrived',
  OTHER: 'Other',
};

const STATUS_LABELS: Record<IssueStatus, string> = {
  SUBMITTED: 'New',
  AWAITING_REVIEW: 'Pending Review',
  INFO_REQUESTED: 'Info Requested',
  APPROVED_REPRINT: 'Approved - Reprint',
  APPROVED_REFUND: 'Approved - Refund',
  PROCESSING: 'Processing',
  COMPLETED: 'Resolved',
  REJECTED: 'Rejected',
  CLOSED: 'Closed',
};

const STATUS_COLORS: Record<IssueStatus, string> = {
  SUBMITTED: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
  AWAITING_REVIEW: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50',
  INFO_REQUESTED: 'bg-orange-500/10 text-orange-500 border-orange-500/50',
  APPROVED_REPRINT: 'bg-purple-500/10 text-purple-500 border-purple-500/50',
  APPROVED_REFUND: 'bg-green-500/10 text-green-500 border-green-500/50',
  PROCESSING: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/50',
  COMPLETED: 'bg-green-500/10 text-green-500 border-green-500/50',
  REJECTED: 'bg-red-500/10 text-red-500 border-red-500/50',
  CLOSED: 'bg-muted text-muted-foreground border-border',
};

type FilterTab = 'all' | 'pending' | 'info_requested' | 'approved' | 'processing' | 'resolved' | 'rejected' | 'carrier';

function IssuesContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [stats, setStats] = useState<IssueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterTab>('pending');

  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ issues: Issue[]; stats: IssueStats }>(
        '/admin/issues'
      );
      setIssues(response.data?.issues || []);
      setStats(response.data?.stats || null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setError(error?.response?.data?.error || error?.message || 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredIssues = () => {
    switch (filter) {
      case 'pending':
        return issues.filter((i) => ['SUBMITTED', 'AWAITING_REVIEW'].includes(i.status));
      case 'info_requested':
        return issues.filter((i) => i.status === 'INFO_REQUESTED');
      case 'approved':
        return issues.filter((i) => ['APPROVED_REPRINT', 'APPROVED_REFUND'].includes(i.status));
      case 'processing':
        return issues.filter((i) => i.status === 'PROCESSING');
      case 'resolved':
        return issues.filter((i) => ['COMPLETED', 'CLOSED'].includes(i.status));
      case 'rejected':
        return issues.filter((i) => i.status === 'REJECTED');
      case 'carrier':
        return issues.filter((i) => i.carrierFault === 'CARRIER_FAULT');
      default:
        return issues;
    }
  };

  const filteredIssues = getFilteredIssues();
  const totalUnread = issues.reduce((sum, i) => sum + i.unreadCount, 0);

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
            {totalUnread > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {totalUnread} new messages
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            <Card
              className={`card-glow cursor-pointer ${filter === 'all' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFilter('all')}
            >
              <CardHeader className="pb-2">
                <CardDescription>Total</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card
              className={`card-glow cursor-pointer ${filter === 'pending' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFilter('pending')}
            >
              <CardHeader className="pb-2">
                <CardDescription>Pending</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
              </CardContent>
            </Card>
            <Card
              className={`card-glow cursor-pointer ${filter === 'info_requested' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFilter('info_requested')}
            >
              <CardHeader className="pb-2">
                <CardDescription>Info Req</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-500">{stats.infoRequested}</p>
              </CardContent>
            </Card>
            <Card
              className={`card-glow cursor-pointer ${filter === 'approved' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFilter('approved')}
            >
              <CardHeader className="pb-2">
                <CardDescription>Approved</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
              </CardContent>
            </Card>
            <Card
              className={`card-glow cursor-pointer ${filter === 'processing' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFilter('processing')}
            >
              <CardHeader className="pb-2">
                <CardDescription>Processing</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-cyan-500">{stats.processing}</p>
              </CardContent>
            </Card>
            <Card
              className={`card-glow cursor-pointer ${filter === 'resolved' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFilter('resolved')}
            >
              <CardHeader className="pb-2">
                <CardDescription>Resolved</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
              </CardContent>
            </Card>
            <Card
              className={`card-glow cursor-pointer ${filter === 'carrier' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFilter('carrier')}
            >
              <CardHeader className="pb-2">
                <CardDescription>Carrier Fault</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-500">{stats.carrierFault}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
            className={filter !== 'pending' ? 'text-yellow-500 border-yellow-500/50' : ''}
          >
            Pending {stats?.pending ? `(${stats.pending})` : ''}
          </Button>
          <Button
            variant={filter === 'info_requested' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('info_requested')}
            className={filter !== 'info_requested' ? 'text-orange-500 border-orange-500/50' : ''}
          >
            Awaiting Info
          </Button>
          <Button
            variant={filter === 'approved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('approved')}
            className={filter !== 'approved' ? 'text-purple-500 border-purple-500/50' : ''}
          >
            Approved
          </Button>
          <Button
            variant={filter === 'processing' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('processing')}
            className={filter !== 'processing' ? 'text-cyan-500 border-cyan-500/50' : ''}
          >
            Processing
          </Button>
          <Button
            variant={filter === 'resolved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('resolved')}
            className={filter !== 'resolved' ? 'text-green-500 border-green-500/50' : ''}
          >
            Resolved
          </Button>
          <Button
            variant={filter === 'rejected' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('rejected')}
            className={filter !== 'rejected' ? 'text-red-500 border-red-500/50' : ''}
          >
            Rejected
          </Button>
          <Button
            variant={filter === 'carrier' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('carrier')}
            className={filter !== 'carrier' ? 'text-red-500 border-red-500/50' : ''}
          >
            <Truck className="w-4 h-4 mr-1" />
            Carrier Claims
          </Button>
        </div>

        {/* Issues List */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle>
              {filter === 'all' && 'All Issues'}
              {filter === 'pending' && 'Pending Review'}
              {filter === 'info_requested' && 'Awaiting Customer Information'}
              {filter === 'approved' && 'Approved - Ready to Process'}
              {filter === 'processing' && 'Currently Processing'}
              {filter === 'resolved' && 'Resolved Issues'}
              {filter === 'rejected' && 'Rejected Issues'}
              {filter === 'carrier' && 'Carrier Fault Claims'}
            </CardTitle>
            <CardDescription>
              {filteredIssues.length} {filteredIssues.length === 1 ? 'issue' : 'issues'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-md h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No issues found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredIssues.map((issue) => (
                  <Link
                    key={issue.id}
                    href={`/admin/issues/${issue.id}`}
                    className="block p-4 bg-card/30 rounded-lg hover:bg-card/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={`${STATUS_COLORS[issue.status]} border`}>
                            {STATUS_LABELS[issue.status]}
                          </Badge>
                          {issue.carrierFault === 'CARRIER_FAULT' && (
                            <Badge className="bg-red-500/10 text-red-500 border-red-500/50 border">
                              <Truck className="w-3 h-3 mr-1" />
                              Carrier Fault
                            </Badge>
                          )}
                          {issue.unreadCount > 0 && (
                            <Badge variant="destructive" className="animate-pulse">
                              <MessageSquare className="w-3 h-3 mr-1" />
                              {issue.unreadCount} unread
                            </Badge>
                          )}
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
                          </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium">
                              {issue.orderItem.product?.name || 'Product'}
                              {issue.orderItem.variant && ` - ${issue.orderItem.variant.name}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {REASON_LABELS[issue.reason] || issue.reason}
                            </p>
                            <p className="text-sm">
                              <span className="text-muted-foreground">Customer:</span>{' '}
                              <span className="font-medium">{issue.orderItem.order.customer.name}</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-sm">
                              <span className="text-muted-foreground">Order:</span>{' '}
                              <span className="font-mono">
                                {issue.orderItem.order.id.slice(0, 8).toUpperCase()}
                              </span>
                            </p>
                            <p className="text-sm">
                              <span className="text-muted-foreground">Item Value:</span>{' '}
                              £{Number(issue.orderItem.totalPrice).toFixed(2)}
                            </p>
                            {issue.orderItem.order.trackingNumber && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">Tracking:</span>{' '}
                                <span className="font-mono text-xs">
                                  {issue.orderItem.order.trackingNumber}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>

                        {issue.initialNotes && (
                          <p className="text-sm mt-2 text-muted-foreground italic truncate">
                            &quot;{issue.initialNotes}&quot;
                          </p>
                        )}

                        {/* Customer photos preview */}
                        {issue.imageUrls && issue.imageUrls.length > 0 && (
                          <div className="mt-2 flex gap-2">
                            {issue.imageUrls.slice(0, 3).map((url, idx) => (
                              <div
                                key={idx}
                                className="w-10 h-10 rounded overflow-hidden border border-border"
                              >
                                <img
                                  src={url}
                                  alt={`Evidence ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                            {issue.imageUrls.length > 3 && (
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                +{issue.imageUrls.length - 3}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Resolution info */}
                        {issue.status === 'COMPLETED' && (
                          <div className="mt-2 text-sm text-green-500">
                            {issue.resolvedType === 'REPRINT' && 'Resolved with reprint'}
                            {issue.resolvedType === 'FULL_REFUND' && issue.refundAmount && (
                              <>Refunded £{Number(issue.refundAmount).toFixed(2)}</>
                            )}
                            {issue.resolvedType === 'PARTIAL_REFUND' && issue.refundAmount && (
                              <>Partial refund: £{Number(issue.refundAmount).toFixed(2)}</>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        <Button variant="outline" size="sm">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          Manage
                        </Button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function IssuesPage() {
  return (
    <ProtectedRoute>
      <IssuesContent />
    </ProtectedRoute>
  );
}
