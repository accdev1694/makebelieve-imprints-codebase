'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import apiClient from '@/lib/api/client';
import { format, formatDistanceToNow } from 'date-fns';

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

type MessageSender = 'CUSTOMER' | 'ADMIN';

interface IssueMessage {
  id: string;
  sender: MessageSender;
  senderId: string;
  content: string;
  imageUrls: string[] | null;
  createdAt: string;
  readAt: string | null;
}

interface Issue {
  id: string;
  reason: string;
  status: IssueStatus;
  carrierFault: 'UNKNOWN' | 'CARRIER_FAULT' | 'NOT_CARRIER_FAULT';
  initialNotes: string | null;
  imageUrls: string[] | null;
  resolvedType: 'REPRINT' | 'FULL_REFUND' | 'PARTIAL_REFUND' | null;
  reprintOrderId: string | null;
  reprintItemId: string | null;
  refundAmount: number | null;
  rejectionReason: string | null;
  rejectionFinal: boolean;
  createdAt: string;
  reviewedAt: string | null;
  processedAt: string | null;
  closedAt: string | null;
  orderItem: {
    id: string;
    quantity: number;
    unitPrice: number | string;
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
      size: string | null;
      color: string | null;
    } | null;
    design: {
      id: string;
      title: string | null;
      previewUrl: string | null;
      fileUrl: string | null;
    } | null;
  };
  messages: IssueMessage[];
  originalIssue: {
    id: string;
    reason: string;
    status: IssueStatus;
    createdAt: string;
  } | null;
  childIssues: {
    id: string;
    reason: string;
    status: IssueStatus;
    createdAt: string;
  }[];
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
  APPROVED_REPRINT: 'Approved for Reprint',
  APPROVED_REFUND: 'Approved for Refund',
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

function IssueDetailContent() {
  const params = useParams();
  const router = useRouter();
  const issueId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [appealing, setAppealing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    fetchIssue();
  }, [issueId]);

  useEffect(() => {
    scrollToBottom();
  }, [issue?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchIssue = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ issue: Issue }>(`/issues/${issueId}`);
      setIssue(response.data?.issue || null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setError(error?.response?.data?.error || error?.message || 'Failed to load issue');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageContent.trim() || sendingMessage) return;

    try {
      setSendingMessage(true);
      await apiClient.post(`/issues/${issueId}/messages`, {
        content: messageContent.trim(),
      });
      setMessageContent('');
      await fetchIssue(); // Refresh to get new message
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      alert(error?.response?.data?.error || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAppeal = async () => {
    if (appealing) return;

    const reason = prompt('Please explain why you believe this decision should be reconsidered:');
    if (!reason || !reason.trim()) return;

    try {
      setAppealing(true);
      await apiClient.post(`/issues/${issueId}/appeal`, {
        reason: reason.trim(),
      });
      await fetchIssue();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      alert(error?.response?.data?.error || 'Failed to submit appeal');
    } finally {
      setAppealing(false);
    }
  };

  const handleWithdraw = async () => {
    if (withdrawing) return;
    if (!confirm('Are you sure you want to withdraw this issue? This action cannot be undone.')) {
      return;
    }

    try {
      setWithdrawing(true);
      await apiClient.delete(`/issues/${issueId}`);
      router.push('/account/issues');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      alert(error?.response?.data?.error || 'Failed to withdraw issue');
      setWithdrawing(false);
    }
  };

  const getItemImage = (): string | null => {
    if (!issue) return null;
    return issue.orderItem.design?.previewUrl || issue.orderItem.design?.fileUrl || null;
  };

  const canSendMessage = issue && !['COMPLETED', 'CLOSED'].includes(issue.status);
  const canWithdraw = issue && ['SUBMITTED', 'AWAITING_REVIEW'].includes(issue.status);
  const canAppeal = issue && issue.status === 'REJECTED' && !issue.rejectionFinal;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-md h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading issue...</p>
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <Link href="/account/issues">
              <Button variant="ghost" size="sm">
                ← Back to Issues
              </Button>
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm">
            {error || 'Issue not found'}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/account/issues">
              <Button variant="ghost" size="sm">
                ← Back to Issues
              </Button>
            </Link>
            <h1 className="text-xl font-bold">
              <span className="text-neon-gradient">Issue Details</span>
            </h1>
          </div>
          <Badge className={`${STATUS_COLORS[issue.status]} border`}>
            {STATUS_LABELS[issue.status]}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-6">
          {/* Issue Summary */}
          <Card className="card-glow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Issue Summary</span>
                <span className="text-sm font-mono text-muted-foreground">
                  #{issue.id.slice(0, 8).toUpperCase()}
                </span>
              </CardTitle>
              <CardDescription>
                Reported {format(new Date(issue.createdAt), 'PPP')} at{' '}
                {format(new Date(issue.createdAt), 'p')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6">
                {/* Item Image */}
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {getItemImage() ? (
                    <img
                      src={getItemImage()!}
                      alt="Item"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      No image
                    </div>
                  )}
                </div>

                {/* Item Details */}
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="font-medium">
                      {issue.orderItem.product?.name || 'Custom Product'}
                      {issue.orderItem.variant && (
                        <span className="text-muted-foreground">
                          {' '}- {issue.orderItem.variant.name}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {issue.orderItem.quantity} | £{Number(issue.orderItem.totalPrice).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Order: </span>
                      <Link
                        href={`/orders/${issue.orderItem.order.id}`}
                        className="text-primary hover:underline font-mono"
                      >
                        {issue.orderItem.order.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reason: </span>
                      <span className="font-medium">
                        {REASON_LABELS[issue.reason] || issue.reason}
                      </span>
                    </div>
                  </div>

                  {issue.initialNotes && (
                    <p className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3">
                      &quot;{issue.initialNotes}&quot;
                    </p>
                  )}
                </div>
              </div>

              {/* Customer Evidence Photos */}
              {issue.imageUrls && issue.imageUrls.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm font-medium mb-2">Evidence Photos</p>
                  <div className="flex flex-wrap gap-2">
                    {issue.imageUrls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-16 h-16 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                      >
                        <img
                          src={url}
                          alt={`Evidence ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution Info */}
              {issue.status === 'COMPLETED' && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  {issue.resolvedType === 'REPRINT' && issue.reprintOrderId && (
                    <div className="text-green-500">
                      <p className="font-medium">Resolved with Reprint</p>
                      <p className="text-sm">
                        A replacement order has been created:{' '}
                        <Link
                          href={`/orders/${issue.reprintOrderId}`}
                          className="underline hover:text-green-400"
                        >
                          View Reprint Order
                        </Link>
                      </p>
                    </div>
                  )}
                  {(issue.resolvedType === 'FULL_REFUND' || issue.resolvedType === 'PARTIAL_REFUND') && (
                    <div className="text-green-500">
                      <p className="font-medium">
                        {issue.resolvedType === 'FULL_REFUND' ? 'Full Refund Issued' : 'Partial Refund Issued'}
                      </p>
                      {issue.refundAmount && (
                        <p className="text-sm">
                          £{Number(issue.refundAmount).toFixed(2)} has been refunded to your payment method.
                          It may take 5-10 business days to appear.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Rejection Info */}
              {issue.status === 'REJECTED' && issue.rejectionReason && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="font-medium text-red-500">Issue Rejected</p>
                  <p className="text-sm text-muted-foreground mt-1">{issue.rejectionReason}</p>
                  {!issue.rejectionFinal && (
                    <p className="text-xs text-muted-foreground mt-2">
                      You may appeal this decision if you believe it was made in error.
                    </p>
                  )}
                  {issue.rejectionFinal && (
                    <p className="text-xs text-red-400 mt-2">
                      This decision is final and cannot be appealed.
                    </p>
                  )}
                </div>
              )}

              {/* Info Requested Alert */}
              {issue.status === 'INFO_REQUESTED' && (
                <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <p className="font-medium text-orange-500">Additional Information Requested</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please review the latest message from our team and provide the requested information.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-3">
                {canWithdraw && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleWithdraw}
                    disabled={withdrawing}
                  >
                    {withdrawing ? 'Withdrawing...' : 'Withdraw Issue'}
                  </Button>
                )}
                {canAppeal && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleAppeal}
                    disabled={appealing}
                  >
                    {appealing ? 'Submitting...' : 'Appeal Decision'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <TimelineItem
                  label="Issue Submitted"
                  date={issue.createdAt}
                  active={true}
                />
                {issue.reviewedAt && (
                  <TimelineItem
                    label="Reviewed by Team"
                    date={issue.reviewedAt}
                    active={true}
                  />
                )}
                {issue.status === 'INFO_REQUESTED' && (
                  <TimelineItem
                    label="Information Requested"
                    date={null}
                    active={true}
                    pending
                  />
                )}
                {(issue.status === 'APPROVED_REPRINT' || issue.status === 'APPROVED_REFUND') && (
                  <TimelineItem
                    label={issue.status === 'APPROVED_REPRINT' ? 'Approved for Reprint' : 'Approved for Refund'}
                    date={issue.reviewedAt}
                    active={true}
                  />
                )}
                {issue.processedAt && (
                  <TimelineItem
                    label={issue.resolvedType === 'REPRINT' ? 'Reprint Created' : 'Refund Processed'}
                    date={issue.processedAt}
                    active={true}
                  />
                )}
                {issue.closedAt && (
                  <TimelineItem
                    label="Issue Closed"
                    date={issue.closedAt}
                    active={true}
                  />
                )}
                {issue.status === 'REJECTED' && (
                  <TimelineItem
                    label={issue.rejectionFinal ? 'Rejected (Final)' : 'Rejected'}
                    date={issue.reviewedAt}
                    active={true}
                    error
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Messages Thread */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Correspondence</CardTitle>
              <CardDescription>
                Messages between you and our support team
              </CardDescription>
            </CardHeader>
            <CardContent>
              {issue.messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No messages yet.</p>
                  <p className="text-sm mt-1">Our team will respond to your issue shortly.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {issue.messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {/* Message Input */}
              {canSendMessage && (
                <div className="mt-4 pt-4 border-t border-border">
                  <Textarea
                    placeholder="Type your message..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    rows={3}
                    className="mb-3"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={sendMessage}
                      disabled={!messageContent.trim() || sendingMessage}
                    >
                      {sendingMessage ? 'Sending...' : 'Send Message'}
                    </Button>
                  </div>
                </div>
              )}

              {!canSendMessage && (
                <div className="mt-4 pt-4 border-t border-border text-center text-sm text-muted-foreground">
                  This issue has been closed and no longer accepts messages.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function TimelineItem({
  label,
  date,
  active,
  pending = false,
  error = false,
}: {
  label: string;
  date: string | null;
  active: boolean;
  pending?: boolean;
  error?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
          error
            ? 'bg-red-500'
            : pending
            ? 'bg-orange-500 animate-pulse'
            : active
            ? 'bg-green-500'
            : 'bg-muted'
        }`}
      />
      <div className="flex-1">
        <p className={`text-sm font-medium ${error ? 'text-red-500' : ''}`}>{label}</p>
        {date && (
          <p className="text-xs text-muted-foreground">
            {format(new Date(date), 'PPP')} at {format(new Date(date), 'p')}
          </p>
        )}
        {pending && !date && (
          <p className="text-xs text-orange-500">Awaiting your response</p>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: IssueMessage }) {
  const isCustomer = message.sender === 'CUSTOMER';

  return (
    <div className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          isCustomer
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium">
            {isCustomer ? 'You' : 'Support Team'}
          </span>
          <span className={`text-xs ${isCustomer ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.imageUrls && message.imageUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.imageUrls.map((url, index) => (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-12 h-12 rounded overflow-hidden border border-border/50 hover:border-border transition-colors"
              >
                <img
                  src={url}
                  alt={`Attachment ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function IssueDetailPage() {
  return (
    <ProtectedRoute>
      <IssueDetailContent />
    </ProtectedRoute>
  );
}
