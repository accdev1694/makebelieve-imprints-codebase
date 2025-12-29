'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api/client';
import { formatDistanceToNow } from 'date-fns';
import { Lock } from 'lucide-react';

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
  initialNotes: string | null;
  imageUrls: string[] | null;
  resolvedType: 'REPRINT' | 'FULL_REFUND' | 'PARTIAL_REFUND' | null;
  reprintOrderId: string | null;
  refundAmount: number | null;
  isConcluded: boolean;
  createdAt: string;
  processedAt: string | null;
  unreadCount: number;
  latestMessage: {
    id: string;
    sender: 'CUSTOMER' | 'ADMIN';
    content: string;
    createdAt: string;
  } | null;
  orderItem: {
    id: string;
    quantity: number;
    totalPrice: number | string;
    order: {
      id: string;
      status: string;
      createdAt: string;
      trackingNumber: string | null;
    };
    product: {
      id: string;
      name: string;
      slug: string;
    } | null;
    variant: {
      id: string;
      name: string;
    } | null;
    design: {
      id: string;
      title: string | null;
      previewUrl: string | null;
      fileUrl: string | null;
    } | null;
  };
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
  SUBMITTED: 'Submitted',
  AWAITING_REVIEW: 'Under Review',
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
  APPROVED_REPRINT: 'bg-green-500/10 text-green-500 border-green-500/50',
  APPROVED_REFUND: 'bg-green-500/10 text-green-500 border-green-500/50',
  PROCESSING: 'bg-purple-500/10 text-purple-500 border-purple-500/50',
  COMPLETED: 'bg-green-500/10 text-green-500 border-green-500/50',
  REJECTED: 'bg-red-500/10 text-red-500 border-red-500/50',
  CLOSED: 'bg-gray-500/10 text-gray-500 border-gray-500/50',
};

type FilterStatus = 'all' | 'active' | 'resolved';

function IssuesContent() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ issues: Issue[] }>('/issues');
      setIssues(response.data?.issues || []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setError(error?.response?.data?.error || error?.message || 'Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  const getItemImage = (issue: Issue): string | null => {
    return issue.orderItem.design?.previewUrl || issue.orderItem.design?.fileUrl || null;
  };

  const filteredIssues = issues.filter((issue) => {
    if (filter === 'active') {
      return !issue.isConcluded;
    }
    if (filter === 'resolved') {
      return issue.isConcluded;
    }
    return true;
  });

  const activeCount = issues.filter((i) => !i.isConcluded).length;
  const totalUnread = issues.reduce((sum, i) => sum + i.unreadCount, 0);

  // Group issues by order
  const issuesByOrder = filteredIssues.reduce((acc, issue) => {
    const orderId = issue.orderItem.order.id;
    if (!acc[orderId]) {
      acc[orderId] = {
        order: issue.orderItem.order,
        issues: [],
      };
    }
    acc[orderId].issues.push(issue);
    return acc;
  }, {} as Record<string, { order: Issue['orderItem']['order']; issues: Issue[] }>);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                ← Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">
              <span className="text-neon-gradient">My Issues</span>
            </h1>
            {totalUnread > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {totalUnread} unread
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

        {/* Stats & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{issues.length} total issues</span>
            <span>{activeCount} active</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('active')}
            >
              Active
            </Button>
            <Button
              variant={filter === 'resolved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('resolved')}
            >
              Resolved
            </Button>
          </div>
        </div>

        <Card className="card-glow">
          <CardHeader>
            <CardTitle>Reported Issues</CardTitle>
            <CardDescription>
              Track the status of issues you&apos;ve reported on your orders
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
                <p className="text-muted-foreground">
                  {filter === 'all'
                    ? 'No issues reported'
                    : filter === 'active'
                    ? 'No active issues'
                    : 'No resolved issues'}
                </p>
                {filter === 'all' && (
                  <>
                    <p className="text-sm text-muted-foreground mt-2">
                      If you have any problems with an order, you can report an issue from the order details page.
                    </p>
                    <Link href="/orders">
                      <Button variant="outline" className="mt-4">
                        View My Orders
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(issuesByOrder).map(([orderId, { order, issues: orderIssues }]) => (
                  <div key={orderId} className="space-y-3">
                    {/* Order Header */}
                    <div className="flex items-center justify-between text-sm border-b border-border pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Order</span>
                        <Link
                          href={`/orders/${orderId}`}
                          className="font-mono text-primary hover:underline"
                        >
                          {orderId.slice(0, 8).toUpperCase()}
                        </Link>
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <span className="text-muted-foreground">
                        {orderIssues.length} {orderIssues.length === 1 ? 'issue' : 'issues'}
                      </span>
                    </div>

                    {/* Issues for this order */}
                    {orderIssues.map((issue) => (
                      <Link
                        key={issue.id}
                        href={`/account/issues/${issue.id}`}
                        className="block p-4 bg-card/30 rounded-lg hover:bg-card/50 transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          {/* Item Image */}
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                            {getItemImage(issue) ? (
                              <img
                                src={getItemImage(issue)!}
                                alt="Item"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                No image
                              </div>
                            )}
                          </div>

                          {/* Issue Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge className={`${STATUS_COLORS[issue.status]} border`}>
                                {STATUS_LABELS[issue.status]}
                              </Badge>
                              {issue.isConcluded && (
                                <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/50 border">
                                  <Lock className="w-3 h-3 mr-1" />
                                  Concluded
                                </Badge>
                              )}
                              {issue.unreadCount > 0 && (
                                <Badge variant="destructive" className="animate-pulse">
                                  {issue.unreadCount} new
                                </Badge>
                              )}
                              {issue.status === 'INFO_REQUESTED' && !issue.isConcluded && (
                                <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/50 border">
                                  Action Required
                                </Badge>
                              )}
                            </div>

                            <p className="font-medium">
                              {issue.orderItem.product?.name || 'Custom Product'}
                              {issue.orderItem.variant && (
                                <span className="text-muted-foreground font-normal">
                                  {' '}- {issue.orderItem.variant.name}
                                </span>
                              )}
                            </p>

                            <p className="text-sm text-muted-foreground">
                              {REASON_LABELS[issue.reason] || issue.reason}
                              <span className="mx-2">·</span>
                              Reported {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
                            </p>

                            {/* Latest message preview */}
                            {issue.latestMessage && (
                              <p className="text-sm text-muted-foreground mt-2 truncate">
                                <span className="font-medium">
                                  {issue.latestMessage.sender === 'ADMIN' ? 'Support: ' : 'You: '}
                                </span>
                                {issue.latestMessage.content}
                              </p>
                            )}

                            {/* Resolution Info */}
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

                          {/* Arrow indicator */}
                          <div className="flex-shrink-0 text-muted-foreground">
                            →
                          </div>
                        </div>
                      </Link>
                    ))}
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

export default function IssuesPage() {
  return (
    <ProtectedRoute>
      <IssuesContent />
    </ProtectedRoute>
  );
}
