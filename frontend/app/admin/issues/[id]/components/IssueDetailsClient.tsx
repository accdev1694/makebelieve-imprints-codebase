'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api/client';

import {
  Issue,
  ReviewAction,
  RefundType,
  CarrierFault,
  ClaimStatus,
} from './types';
import { IssueHeader } from './IssueHeader';
import { IssueSummary } from './IssueSummary';
import { IssueStatusManager } from './IssueStatusManager';
import { IssueMessaging } from './IssueMessaging';
import { IssueCarrierFault } from './IssueCarrierFault';
import { IssueInsuranceClaim } from './IssueInsuranceClaim';
import { IssueOrderInfo } from './IssueOrderInfo';
import { IssueCustomerInfo } from './IssueCustomerInfo';
import { IssueConcludedStatus } from './IssueConcludedStatus';
import { ReviewModal, ProcessModal, ConcludeModal } from './IssueModals';

interface IssueDetailsClientProps {
  issueId: string;
}

export function IssueDetailsClient({ issueId }: IssueDetailsClientProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Action states
  const [sendingMessage, setSendingMessage] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Review modal state
  const [reviewAction, setReviewAction] = useState<ReviewAction | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // Process modal state
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [refundType, setRefundType] = useState<RefundType>('FULL_REFUND');
  const [processNotes, setProcessNotes] = useState('');

  // Conclude modal state
  const [concludeModalOpen, setConcludeModalOpen] = useState(false);
  const [concludeReason, setConcludeReason] = useState('');

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch issue data
  const fetchIssue = useCallback(async () => {
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
  }, [issueId]);

  useEffect(() => {
    fetchIssue();
  }, [fetchIssue]);

  // Action handlers
  const handleSendMessage = async (content: string, imageUrls: string[]) => {
    if (sendingMessage) return;

    try {
      setSendingMessage(true);
      await apiClient.post(`/admin/issues/${issueId}/messages`, {
        content,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });
      await fetchIssue();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      alert(error?.response?.data?.error || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleReview = async () => {
    if (!reviewAction || actionLoading) return;

    try {
      setActionLoading(true);
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

  const handleCarrierFault = async (value: CarrierFault) => {
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

  const handleSaveClaim = async (data: {
    claimReference: string;
    claimStatus: ClaimStatus;
    claimPayoutAmount: string;
    claimNotes: string;
  }) => {
    try {
      await apiClient.put(`/admin/issues/${issueId}/claim`, {
        claimReference: data.claimReference || undefined,
        claimStatus: data.claimStatus,
        claimPayoutAmount: data.claimPayoutAmount ? parseFloat(data.claimPayoutAmount) : undefined,
        claimNotes: data.claimNotes || undefined,
      });
      await fetchIssue();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      alert(error?.response?.data?.error || 'Failed to update claim');
    }
  };

  const handleDownloadClaimReport = async () => {
    try {
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

  // Guard: non-admin users
  if (user && user.userType !== 'PRINTER_ADMIN') {
    return null;
  }

  // Loading state
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

  // Error state
  if (error || !issue) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <Link href="/admin/returns">
              <Button variant="ghost" size="sm">
                &larr; Back to Issues
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
      <IssueHeader issue={issue} />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Issue Details */}
          <div className="lg:col-span-2 space-y-6">
            <IssueSummary issue={issue} />
            <IssueMessaging
              issue={issue}
              sendingMessage={sendingMessage}
              onSendMessage={handleSendMessage}
            />
          </div>

          {/* Right Column - Actions & Info */}
          <div className="space-y-6">
            <IssueConcludedStatus issue={issue} />

            <IssueStatusManager
              issue={issue}
              actionLoading={actionLoading}
              onReviewAction={setReviewAction}
              onProcess={() => setProcessModalOpen(true)}
              onConclude={() => setConcludeModalOpen(true)}
              onReopen={handleReopen}
            />

            <IssueCarrierFault
              issue={issue}
              actionLoading={actionLoading}
              onCarrierFaultChange={handleCarrierFault}
            />

            <IssueInsuranceClaim
              issue={issue}
              onSaveClaim={handleSaveClaim}
              onDownloadReport={handleDownloadClaimReport}
            />

            <IssueOrderInfo issue={issue} />
            <IssueCustomerInfo issue={issue} />
          </div>
        </div>
      </main>

      {/* Modals */}
      <ReviewModal
        open={!!reviewAction}
        action={reviewAction}
        notes={reviewNotes}
        loading={actionLoading}
        onNotesChange={setReviewNotes}
        onClose={() => setReviewAction(null)}
        onConfirm={handleReview}
      />

      <ProcessModal
        open={processModalOpen}
        issue={issue}
        refundType={refundType}
        notes={processNotes}
        loading={actionLoading}
        onRefundTypeChange={setRefundType}
        onNotesChange={setProcessNotes}
        onClose={() => setProcessModalOpen(false)}
        onConfirm={handleProcess}
      />

      <ConcludeModal
        open={concludeModalOpen}
        reason={concludeReason}
        loading={actionLoading}
        onReasonChange={setConcludeReason}
        onClose={() => setConcludeModalOpen(false)}
        onConfirm={handleConclude}
      />
    </div>
  );
}
