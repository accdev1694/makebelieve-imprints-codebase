'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import apiClient from '@/lib/api/client';

interface Issue {
  id: string;
  type: 'REPRINT' | 'REFUND';
  reason: string;
  notes: string | null;
  imageUrls: string[] | null;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  processedAt: string | null;
  reprintOrderId: string | null;
  refundAmount: number | null;
  order: {
    id: string;
    totalPrice: number | string;
    status: string;
    createdAt: string;
    previewUrl: string | null;
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
  OTHER: 'Other',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Under Review',
  PROCESSING: 'Processing',
  COMPLETED: 'Resolved',
  FAILED: 'Failed',
};

function IssuesContent() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const getStatusColor = (status: Issue['status']): string => {
    const colors: Record<Issue['status'], string> = {
      PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50',
      PROCESSING: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
      COMPLETED: 'bg-green-500/10 text-green-500 border-green-500/50',
      FAILED: 'bg-red-500/10 text-red-500 border-red-500/50',
    };
    return colors[status];
  };

  const getOrderImage = (issue: Issue): string | null => {
    return issue.order.previewUrl || issue.order.design?.previewUrl || issue.order.design?.fileUrl || null;
  };

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
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

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
            ) : issues.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No issues reported</p>
                <p className="text-sm text-muted-foreground mt-2">
                  If you have any problems with an order, you can report an issue from the order details page.
                </p>
                <Link href="/orders">
                  <Button variant="outline" className="mt-4">
                    View My Orders
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-4 bg-card/30 rounded-lg hover:bg-card/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Order Image */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {getOrderImage(issue) ? (
                          <img
                            src={getOrderImage(issue)!}
                            alt="Order"
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
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className={`${getStatusColor(issue.status)} border`}>
                            {STATUS_LABELS[issue.status]}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Reported {new Date(issue.createdAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <p className="text-sm mb-1">
                          <span className="text-muted-foreground">Order:</span>{' '}
                          <Link
                            href={`/orders/${issue.order.id}`}
                            className="text-primary hover:underline font-mono"
                          >
                            {issue.order.id.slice(0, 8).toUpperCase()}
                          </Link>
                        </p>

                        <p className="text-sm mb-1">
                          <span className="text-muted-foreground">Issue:</span>{' '}
                          {REASON_LABELS[issue.reason] || issue.reason}
                        </p>

                        {issue.notes && (
                          <p className="text-sm text-muted-foreground italic mt-1">
                            &quot;{issue.notes}&quot;
                          </p>
                        )}

                        {/* Resolution Info */}
                        {issue.status === 'COMPLETED' && (
                          <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded-md">
                            {issue.type === 'REPRINT' && issue.reprintOrderId && (
                              <p className="text-sm text-green-500">
                                Resolved with reprint:{' '}
                                <Link
                                  href={`/orders/${issue.reprintOrderId}`}
                                  className="underline hover:text-green-400"
                                >
                                  View Reprint Order
                                </Link>
                              </p>
                            )}
                            {issue.type === 'REFUND' && issue.refundAmount && (
                              <p className="text-sm text-green-500">
                                Refunded: £{Number(issue.refundAmount).toFixed(2)}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Customer Uploaded Images */}
                        {issue.imageUrls && issue.imageUrls.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground mb-1">Your photos:</p>
                            <div className="flex flex-wrap gap-2">
                              {issue.imageUrls.map((url, imgIndex) => (
                                <a
                                  key={imgIndex}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block w-12 h-12 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                                >
                                  <img
                                    src={url}
                                    alt={`Issue photo ${imgIndex + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* View Order Button */}
                      <Link href={`/orders/${issue.order.id}`} className="flex-shrink-0">
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

export default function IssuesPage() {
  return (
    <ProtectedRoute>
      <IssuesContent />
    </ProtectedRoute>
  );
}
