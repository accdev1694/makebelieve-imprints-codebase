'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import apiClient from '@/lib/api/client';
import { storageService } from '@/lib/api/storage';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { AlertCircle, Check, X, MessageSquare, Truck, RefreshCw, DollarSign, Info, FileText, Download, Camera, Lock, Unlock } from 'lucide-react';
import { Input } from '@/components/ui/input';

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
  stripeRefundId: string | null;
  rejectionReason: string | null;
  rejectionFinal: boolean;
  // Conclusion tracking
  isConcluded: boolean;
  concludedAt: string | null;
  concludedBy: string | null;
  concludedReason: string | null;
  // Claim tracking
  claimReference: string | null;
  claimStatus: 'NOT_FILED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';
  claimSubmittedAt: string | null;
  claimPayoutAmount: number | null;
  claimPaidAt: string | null;
  claimNotes: string | null;
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
      carrier: string | null;
      totalPrice: number | string;
      shippingAddress: {
        name: string;
        addressLine1: string;
        addressLine2?: string;
        city: string;
        postcode: string;
        country: string;
      };
      customer: {
        id: string;
        name: string;
        email: string;
      };
      payment?: {
        id: string;
        stripePaymentId: string;
        status: string;
        refundedAt: string | null;
      };
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
  APPROVED_REPRINT: 'bg-purple-500/10 text-purple-500 border-purple-500/50',
  APPROVED_REFUND: 'bg-green-500/10 text-green-500 border-green-500/50',
  PROCESSING: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/50',
  COMPLETED: 'bg-green-500/10 text-green-500 border-green-500/50',
  REJECTED: 'bg-red-500/10 text-red-500 border-red-500/50',
  CLOSED: 'bg-muted text-muted-foreground border-border',
};

function AdminIssueDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const issueId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Actions
  const [messageContent, setMessageContent] = useState('');
  const [messageImages, setMessageImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Review modal
  const [reviewAction, setReviewAction] = useState<'approve_reprint' | 'approve_refund' | 'reject' | 'request_info' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Process modal
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [refundType, setRefundType] = useState<'FULL_REFUND' | 'PARTIAL_REFUND'>('FULL_REFUND');
  const [processNotes, setProcessNotes] = useState('');

  // Claim management
  const [claimReference, setClaimReference] = useState('');
  const [claimStatus, setClaimStatus] = useState<string>('NOT_FILED');
  const [claimPayoutAmount, setClaimPayoutAmount] = useState('');
  const [claimNotes, setClaimNotes] = useState('');
  const [claimSaving, setClaimSaving] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);

  // Conclude modal
  const [concludeModalOpen, setConcludeModalOpen] = useState(false);
  const [concludeReason, setConcludeReason] = useState('');

  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    fetchIssue();
  }, [issueId]);

  useEffect(() => {
    scrollToBottom();
  }, [issue?.messages]);

  // Sync claim fields when issue loads
  useEffect(() => {
    if (issue) {
      setClaimReference(issue.claimReference || '');
      setClaimStatus(issue.claimStatus || 'NOT_FILED');
      setClaimPayoutAmount(issue.claimPayoutAmount ? String(issue.claimPayoutAmount) : '');
      setClaimNotes(issue.claimNotes || '');
    }
  }, [issue]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchIssue = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ issue: Issue }>(`/admin/issues/${issueId}`);
      setIssue(response.data?.issue || null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setError(error?.response?.data?.error || error?.message || 'Failed to load issue');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if ((!messageContent.trim() && messageImages.length === 0) || sendingMessage) return;

    try {
      setSendingMessage(true);
      await apiClient.post(`/admin/issues/${issueId}/messages`, {
        content: messageContent.trim() || (messageImages.length > 0 ? '(Image attached)' : ''),
        imageUrls: messageImages.length > 0 ? messageImages : undefined,
      });
      setMessageContent('');
      setMessageImages([]);
      await fetchIssue();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      alert(error?.response?.data?.error || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAdminMessageImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (messageImages.length >= 5) {
      alert('Maximum 5 images allowed per message');
      return;
    }

    const file = files[0];
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPG, PNG, WebP, or GIF)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be less than 10MB');
      return;
    }

    setUploadingImage(true);
    try {
      const imageUrl = await storageService.uploadFile(file);
      setMessageImages((prev) => [...prev, imageUrl]);
    } catch (err: unknown) {
      const error = err as { message?: string };
      alert(error?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const removeAdminMessageImage = (index: number) => {
    setMessageImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReview = async () => {
    if (!reviewAction || actionLoading) return;

    try {
      setActionLoading(true);
      // Convert action to uppercase for API (e.g., 'approve_reprint' -> 'APPROVE_REPRINT')
      const apiAction = reviewAction.toUpperCase();
      await apiClient.post(`/admin/issues/${issueId}/review`, {
        action: apiAction,
        message: reviewNotes || undefined,
      });
      setReviewAction(null);
      setReviewNotes('');
      await fetchIssue();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      alert(error?.response?.data?.error || 'Failed to process review');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcess = async () => {
    if (actionLoading) return;

    try {
      setActionLoading(true);
      await apiClient.post(`/admin/issues/${issueId}/process`, {
        refundType: issue?.status === 'APPROVED_REFUND' ? refundType : undefined,
        notes: processNotes || undefined,
      });
      setProcessModalOpen(false);
      setProcessNotes('');
      await fetchIssue();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      alert(error?.response?.data?.error || 'Failed to process issue');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCarrierFault = async (value: 'UNKNOWN' | 'CARRIER_FAULT' | 'NOT_CARRIER_FAULT') => {
    try {
      setActionLoading(true);
      await apiClient.put(`/admin/issues/${issueId}/carrier-fault`, {
        carrierFault: value,
      });
      await fetchIssue();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      alert(error?.response?.data?.error || 'Failed to update carrier fault');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveClaim = async () => {
    if (claimSaving) return;

    try {
      setClaimSaving(true);
      await apiClient.put(`/admin/issues/${issueId}/claim`, {
        claimReference: claimReference || undefined,
        claimStatus: claimStatus,
        claimPayoutAmount: claimPayoutAmount ? parseFloat(claimPayoutAmount) : undefined,
        claimNotes: claimNotes || undefined,
      });
      await fetchIssue();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      alert(error?.response?.data?.error || 'Failed to update claim');
    } finally {
      setClaimSaving(false);
    }
  };

  const handleDownloadClaimReport = async () => {
    if (downloadingReport) return;

    try {
      setDownloadingReport(true);
      const response = await fetch(`/api/admin/issues/${issueId}/claim-report`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to download report');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claim-report-${issue?.orderItem.order.trackingNumber || issueId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const error = err as { message?: string };
      alert(error?.message || 'Failed to download claim report');
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleConclude = async () => {
    if (actionLoading) return;

    try {
      setActionLoading(true);
      await apiClient.post(`/admin/issues/${issueId}/conclude`, {
        reason: concludeReason || undefined,
      });
      setConcludeModalOpen(false);
      setConcludeReason('');
      await fetchIssue();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      alert(error?.response?.data?.error || 'Failed to conclude issue');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopen = async () => {
    if (actionLoading) return;
    if (!confirm('Are you sure you want to reopen this concluded issue?')) return;

    try {
      setActionLoading(true);
      await apiClient.delete(`/admin/issues/${issueId}/conclude`);
      await fetchIssue();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      alert(error?.response?.data?.error || 'Failed to reopen issue');
    } finally {
      setActionLoading(false);
    }
  };

  const canReview = issue && !issue.isConcluded && ['AWAITING_REVIEW', 'INFO_REQUESTED'].includes(issue.status);
  const canProcess = issue && !issue.isConcluded && ['APPROVED_REPRINT', 'APPROVED_REFUND'].includes(issue.status);
  const canMessage = issue && !issue.isConcluded;
  const canConclude = issue && !issue.isConcluded;
  const canReopen = issue && issue.isConcluded;

  if (user && user.userType !== 'PRINTER_ADMIN') {
    return null;
  }

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
            <Link href="/admin/returns">
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
            <Link href="/admin/returns">
              <Button variant="ghost" size="sm">
                ← Back to Issues
              </Button>
            </Link>
            <h1 className="text-xl font-bold">
              <span className="text-neon-gradient">Issue Management</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${STATUS_COLORS[issue.status]} border`}>
              {STATUS_LABELS[issue.status]}
            </Badge>
            {issue.isConcluded && (
              <Badge className="bg-muted text-muted-foreground border-border border">
                <Lock className="w-3 h-3 mr-1" />
                Concluded
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Issue Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Issue Summary */}
            <Card className="card-glow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Issue #{issue.id.slice(0, 8).toUpperCase()}
                      {issue.carrierFault === 'CARRIER_FAULT' && (
                        <Badge className="bg-red-500/10 text-red-500 border-red-500/50 border">
                          <Truck className="w-3 h-3 mr-1" />
                          Carrier Fault
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Reported {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Item Info */}
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-2">
                    {issue.orderItem.product?.name || 'Product'}
                    {issue.orderItem.variant && ` - ${issue.orderItem.variant.name}`}
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Quantity:</span> {issue.orderItem.quantity}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Item Value:</span> £{Number(issue.orderItem.totalPrice).toFixed(2)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Issue Reason:</span>{' '}
                      <span className="font-medium">{REASON_LABELS[issue.reason] || issue.reason}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Order Total:</span> £{Number(issue.orderItem.order.totalPrice).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Customer Notes */}
                {issue.initialNotes && (
                  <div>
                    <p className="text-sm font-medium mb-1">Customer Notes:</p>
                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg italic">
                      &quot;{issue.initialNotes}&quot;
                    </p>
                  </div>
                )}

                {/* Evidence Photos */}
                {issue.imageUrls && issue.imageUrls.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Evidence Photos</p>
                    <div className="flex flex-wrap gap-2">
                      {issue.imageUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-20 h-20 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                        >
                          <img
                            src={url}
                            alt={`Evidence ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution Status */}
                {issue.status === 'COMPLETED' && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="font-medium text-green-500">Resolved</p>
                    {issue.resolvedType === 'REPRINT' && (
                      <p className="text-sm text-muted-foreground">
                        Reprint order created:{' '}
                        <Link href={`/admin/orders/${issue.reprintOrderId}`} className="text-primary hover:underline font-mono">
                          {issue.reprintOrderId?.slice(0, 8).toUpperCase()}
                        </Link>
                      </p>
                    )}
                    {(issue.resolvedType === 'FULL_REFUND' || issue.resolvedType === 'PARTIAL_REFUND') && (
                      <p className="text-sm text-muted-foreground">
                        {issue.resolvedType === 'FULL_REFUND' ? 'Full' : 'Partial'} refund: £{Number(issue.refundAmount).toFixed(2)}
                        {issue.stripeRefundId && (
                          <span className="font-mono text-xs ml-2">({issue.stripeRefundId})</span>
                        )}
                      </p>
                    )}
                  </div>
                )}

                {issue.status === 'REJECTED' && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="font-medium text-red-500">
                      {issue.rejectionFinal ? 'Rejected (Final)' : 'Rejected'}
                    </p>
                    {issue.rejectionReason && (
                      <p className="text-sm text-muted-foreground mt-1">{issue.rejectionReason}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Messages Thread */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Correspondence
                </CardTitle>
              </CardHeader>
              <CardContent>
                {issue.messages.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <p>No messages yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {issue.messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}

                {canMessage && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <Textarea
                      placeholder="Type your message to customer..."
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      rows={3}
                      className="mb-3"
                    />

                    {/* Image Preview */}
                    {messageImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {messageImages.map((url, index) => (
                          <div key={index} className="relative group">
                            <div className="w-16 h-16 rounded-lg overflow-hidden border border-border">
                              <img
                                src={url}
                                alt={`Attachment ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAdminMessageImage(index)}
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      {/* Image Upload Button */}
                      <div>
                        {messageImages.length < 5 && (
                          <label htmlFor="admin-message-image-upload" className="cursor-pointer">
                            <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors">
                              {uploadingImage ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                                  <span className="text-sm">Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <Camera className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">Add Image</span>
                                </>
                              )}
                            </div>
                          </label>
                        )}
                        <input
                          id="admin-message-image-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleAdminMessageImageUpload}
                          disabled={uploadingImage}
                          className="hidden"
                        />
                      </div>

                      <Button
                        onClick={sendMessage}
                        disabled={!messageContent.trim() && messageImages.length === 0}
                        loading={sendingMessage}
                      >
                        Send Message
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Actions & Info */}
          <div className="space-y-6">
            {/* Concluded Status Indicator */}
            {issue.isConcluded && (
              <Card className="border-border bg-muted/50">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-muted-foreground">Issue Concluded</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        This issue has been concluded. No further actions by the customer are possible.
                      </p>
                      {issue.concludedAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Concluded {format(new Date(issue.concludedAt), 'PPP')} at {format(new Date(issue.concludedAt), 'p')}
                        </p>
                      )}
                      {issue.concludedReason && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          &quot;{issue.concludedReason}&quot;
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            {(canReview || canProcess || canConclude || canReopen) && (
              <Card className="card-glow">
                <CardHeader>
                  <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {canReview && (
                    <>
                      <Button
                        className="w-full bg-purple-500 hover:bg-purple-600"
                        onClick={() => setReviewAction('approve_reprint')}
                        disabled={actionLoading}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Approve Reprint
                      </Button>
                      <Button
                        className="w-full bg-green-500 hover:bg-green-600"
                        onClick={() => setReviewAction('approve_refund')}
                        disabled={actionLoading}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Approve Refund
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-orange-500/50 text-orange-500 hover:text-orange-600"
                        onClick={() => setReviewAction('request_info')}
                        disabled={actionLoading}
                      >
                        <Info className="w-4 h-4 mr-2" />
                        Request More Info
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-red-500/50 text-red-500 hover:text-red-600"
                        onClick={() => setReviewAction('reject')}
                        disabled={actionLoading}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject Issue
                      </Button>
                    </>
                  )}

                  {canProcess && (
                    <Button
                      className="w-full"
                      onClick={() => setProcessModalOpen(true)}
                      disabled={actionLoading}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {issue.status === 'APPROVED_REPRINT' ? 'Create Reprint Order' : 'Process Refund'}
                    </Button>
                  )}

                  {/* Conclude/Reopen Actions */}
                  {(canReview || canProcess) && canConclude && (
                    <div className="pt-2 border-t border-border" />
                  )}

                  {canConclude && (
                    <Button
                      variant="outline"
                      className="w-full border-border text-muted-foreground hover:text-foreground"
                      onClick={() => setConcludeModalOpen(true)}
                      disabled={actionLoading}
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Conclude Issue
                    </Button>
                  )}

                  {canReopen && (
                    <Button
                      variant="outline"
                      className="w-full border-green-500/50 text-green-500 hover:text-green-600"
                      onClick={handleReopen}
                      disabled={actionLoading}
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      Reopen Issue
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Carrier Fault */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Carrier Fault
                </CardTitle>
                <CardDescription>
                  Mark for insurance claims
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={issue.carrierFault}
                  onValueChange={(value: 'UNKNOWN' | 'CARRIER_FAULT' | 'NOT_CARRIER_FAULT') => handleCarrierFault(value)}
                  disabled={actionLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNKNOWN">Unknown</SelectItem>
                    <SelectItem value="CARRIER_FAULT">Carrier Fault</SelectItem>
                    <SelectItem value="NOT_CARRIER_FAULT">Not Carrier Fault</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Insurance Claim - Only show for carrier fault issues */}
            {issue.carrierFault === 'CARRIER_FAULT' && (
              <Card className="border-red-500/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Insurance Claim
                  </CardTitle>
                  <CardDescription>
                    Royal Mail compensation claim tracking
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Download Report Button */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleDownloadClaimReport}
                    disabled={downloadingReport}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {downloadingReport ? 'Generating...' : 'Download Claim Report PDF'}
                  </Button>

                  {/* Claim Status */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Claim Status</Label>
                    <Select
                      value={claimStatus}
                      onValueChange={setClaimStatus}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NOT_FILED">Not Filed</SelectItem>
                        <SelectItem value="SUBMITTED">Submitted</SelectItem>
                        <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Claim Reference */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Claim Reference</Label>
                    <Input
                      placeholder="e.g., RM-12345678"
                      value={claimReference}
                      onChange={(e) => setClaimReference(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {/* Payout Amount - show if approved or paid */}
                  {(claimStatus === 'APPROVED' || claimStatus === 'PAID') && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Payout Amount (£)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={claimPayoutAmount}
                        onChange={(e) => setClaimPayoutAmount(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <Textarea
                      placeholder="Any notes about this claim..."
                      value={claimNotes}
                      onChange={(e) => setClaimNotes(e.target.value)}
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  {/* Save Button */}
                  <Button
                    onClick={handleSaveClaim}
                    loading={claimSaving}
                    className="w-full"
                  >
                    Save Claim Details
                  </Button>

                  {/* Show submitted date if available */}
                  {issue.claimSubmittedAt && (
                    <p className="text-xs text-muted-foreground text-center">
                      Submitted: {format(new Date(issue.claimSubmittedAt), 'dd MMM yyyy')}
                    </p>
                  )}
                  {issue.claimPaidAt && (
                    <p className="text-xs text-green-500 text-center">
                      Paid: {format(new Date(issue.claimPaidAt), 'dd MMM yyyy')} - £{issue.claimPayoutAmount?.toFixed(2)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Order Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Order ID:</span>{' '}
                  <Link href={`/admin/orders/${issue.orderItem.order.id}`} className="text-primary hover:underline font-mono">
                    {issue.orderItem.order.id.slice(0, 8).toUpperCase()}
                  </Link>
                </div>
                <div>
                  <span className="text-muted-foreground">Order Status:</span>{' '}
                  {issue.orderItem.order.status}
                </div>
                {issue.orderItem.order.trackingNumber && (
                  <div>
                    <span className="text-muted-foreground">Tracking:</span>{' '}
                    <span className="font-mono text-xs">{issue.orderItem.order.trackingNumber}</span>
                  </div>
                )}
                {issue.orderItem.order.carrier && (
                  <div>
                    <span className="text-muted-foreground">Carrier:</span>{' '}
                    {issue.orderItem.order.carrier}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="font-medium">{issue.orderItem.order.customer.name}</div>
                <div>
                  <a
                    href={`mailto:${issue.orderItem.order.customer.email}`}
                    className="text-primary hover:underline"
                  >
                    {issue.orderItem.order.customer.email}
                  </a>
                </div>
                <div className="pt-2 border-t border-border text-muted-foreground">
                  <p>{issue.orderItem.order.shippingAddress.addressLine1}</p>
                  {issue.orderItem.order.shippingAddress.addressLine2 && (
                    <p>{issue.orderItem.order.shippingAddress.addressLine2}</p>
                  )}
                  <p>
                    {issue.orderItem.order.shippingAddress.city}, {issue.orderItem.order.shippingAddress.postcode}
                  </p>
                  <p>{issue.orderItem.order.shippingAddress.country}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Review Modal */}
      <Dialog open={!!reviewAction} onOpenChange={() => setReviewAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve_reprint' && 'Approve for Reprint'}
              {reviewAction === 'approve_refund' && 'Approve for Refund'}
              {reviewAction === 'request_info' && 'Request More Information'}
              {reviewAction === 'reject' && 'Reject Issue'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve_reprint' && 'This will approve the issue for a free reprint.'}
              {reviewAction === 'approve_refund' && 'This will approve the issue for a refund.'}
              {reviewAction === 'request_info' && 'Ask the customer for additional information.'}
              {reviewAction === 'reject' && 'Reject this issue request.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="review-notes">
              {reviewAction === 'reject' ? 'Rejection Reason (required)'
                : reviewAction === 'request_info' ? 'What information do you need? (required)'
                : 'Notes (optional)'}
            </Label>
            <Textarea
              id="review-notes"
              placeholder={
                reviewAction === 'request_info'
                  ? 'What information do you need from the customer?'
                  : reviewAction === 'reject'
                  ? 'Please explain why this issue is being rejected...'
                  : 'Add any notes...'
              }
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={(reviewAction === 'reject' || reviewAction === 'request_info') && !reviewNotes.trim()}
              loading={actionLoading}
              className={
                reviewAction === 'reject'
                  ? 'bg-red-500 hover:bg-red-600'
                  : reviewAction === 'approve_reprint'
                  ? 'bg-purple-500 hover:bg-purple-600'
                  : reviewAction === 'approve_refund'
                  ? 'bg-green-500 hover:bg-green-600'
                  : reviewAction === 'request_info'
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : ''
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Modal */}
      <Dialog open={processModalOpen} onOpenChange={setProcessModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {issue?.status === 'APPROVED_REPRINT' ? 'Create Reprint Order' : 'Process Refund'}
            </DialogTitle>
            <DialogDescription>
              {issue?.status === 'APPROVED_REPRINT'
                ? 'This will create a free reprint order for the customer.'
                : 'This will process the refund through Stripe.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {issue?.status === 'APPROVED_REFUND' && (
              <div>
                <Label>Refund Type</Label>
                <Select
                  value={refundType}
                  onValueChange={(value: 'FULL_REFUND' | 'PARTIAL_REFUND') => setRefundType(value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_REFUND">
                      Full Order Refund (£{Number(issue.orderItem.order.totalPrice).toFixed(2)})
                    </SelectItem>
                    <SelectItem value="PARTIAL_REFUND">
                      Item Only (£{Number(issue.orderItem.totalPrice).toFixed(2)})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="process-notes">Message to Customer (optional)</Label>
              <Textarea
                id="process-notes"
                placeholder="The customer will receive this message..."
                value={processNotes}
                onChange={(e) => setProcessNotes(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProcess} loading={actionLoading}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conclude Modal */}
      <Dialog open={concludeModalOpen} onOpenChange={setConcludeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conclude Issue</DialogTitle>
            <DialogDescription>
              Concluding an issue will prevent any further actions by the customer.
              The correspondence history will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="conclude-reason">Reason (optional)</Label>
            <Textarea
              id="conclude-reason"
              placeholder="Why is this issue being concluded?"
              value={concludeReason}
              onChange={(e) => setConcludeReason(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConcludeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConclude}
              loading={actionLoading}
              className="bg-muted-foreground hover:bg-muted-foreground/80"
            >
              <Lock className="w-4 h-4 mr-2" />
              Conclude Issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessageBubble({ message }: { message: IssueMessage }) {
  const isAdmin = message.sender === 'ADMIN';

  return (
    <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg p-3 ${
          isAdmin
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium">
            {isAdmin ? 'Admin' : 'Customer'}
          </span>
          <span className={`text-xs ${isAdmin ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
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

export default function AdminIssueDetailPage() {
  return (
    <ProtectedRoute>
      <AdminIssueDetailContent />
    </ProtectedRoute>
  );
}
