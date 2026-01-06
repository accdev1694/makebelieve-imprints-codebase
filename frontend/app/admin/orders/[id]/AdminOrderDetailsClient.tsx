'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ordersService,
  Order,
  ORDER_STATUS_LABELS,
  OrderStatus,
  CancellationReason,
  cancellationService,
} from '@/lib/api/orders';
import apiClient from '@/lib/api/client';
import { createLogger } from '@/lib/logger';

import {
  AdminOrderHeader,
  AdminOrderItems,
  AdminShippingSection,
  AdminOrderStatus,
  AdminIssueResolution,
  AdminResolutionHistory,
  ReprintModal,
  RefundModal,
  ProcessIssueModal,
  CancelOrderModal,
  ReviewCancellationModal,
  Resolution,
  ApiError,
} from './components';

const logger = createLogger('AdminOrderDetails');

interface AdminOrderDetailsClientProps {
  orderId: string;
}

function AdminOrderDetailsContent({ orderId }: AdminOrderDetailsClientProps) {
  const router = useRouter();
  const { user } = useAuth();

  // Core state
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState(false);

  // Resolution states
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [processingResolution, setProcessingResolution] = useState(false);

  // Modal states
  const [reprintModalOpen, setReprintModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [processIssueModalOpen, setProcessIssueModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [reviewCancelRequestModal, setReviewCancelRequestModal] = useState(false);

  // Modal form state
  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedPendingIssue, setSelectedPendingIssue] = useState<Resolution | null>(null);
  const [processAction, setProcessAction] = useState<'REPRINT' | 'REFUND'>('REPRINT');

  // Cancellation modal states
  const [cancellationReason, setCancellationReason] = useState<CancellationReason | ''>('');
  const [cancellationNotes, setCancellationNotes] = useState('');
  const [processRefund, setProcessRefund] = useState(true);
  const [processingCancellation, setProcessingCancellation] = useState(false);

  // Cancellation request review modal
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState('');

  // Share link state
  const [copied, setCopied] = useState(false);

  // Check admin access
  useEffect(() => {
    if (user && user.userType !== 'PRINTER_ADMIN') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Load order data
  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        setError('No order ID provided');
        setLoading(false);
        return;
      }

      try {
        const orderData = await ordersService.get(orderId);
        setOrder(orderData);
      } catch (err: unknown) {
        const e = err as ApiError;
        setError(e?.error || e?.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  // Load resolutions
  useEffect(() => {
    const loadResolutions = async () => {
      if (!orderId) return;
      try {
        const response = await apiClient.get<{ resolutions: Resolution[] }>(
          `/orders/${orderId}/resolutions`
        );
        setResolutions(response.data?.resolutions || []);
      } catch (err) {
        logger.error('Failed to load resolutions', { error: String(err) });
      }
    };
    loadResolutions();
  }, [orderId]);

  // Helper to reload order and resolutions
  const reloadOrderData = useCallback(async () => {
    const orderData = await ordersService.get(orderId);
    setOrder(orderData);
    const resResponse = await apiClient.get<{ resolutions: Resolution[] }>(
      `/orders/${orderId}/resolutions`
    );
    setResolutions(resResponse.data?.resolutions || []);
  }, [orderId]);

  // Handlers
  const handleReprint = async () => {
    if (!selectedReason) {
      setError('Please select a reason');
      return;
    }

    setProcessingResolution(true);
    setError('');

    try {
      const response = await apiClient.post<{ reprintOrderId: string }>(
        `/orders/${orderId}/reprint`,
        {
          reason: selectedReason,
          notes: notes || undefined,
        }
      );

      setSuccess(
        `Reprint order created successfully. New order ID: ${response.data.reprintOrderId.slice(0, 8).toUpperCase()}`
      );
      setReprintModalOpen(false);
      setSelectedReason('');
      setNotes('');
      await reloadOrderData();
    } catch (err: unknown) {
      const e = err as ApiError;
      setError(e?.response?.data?.error || e?.message || 'Failed to create reprint');
    } finally {
      setProcessingResolution(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedReason) {
      setError('Please select a reason');
      return;
    }

    setProcessingResolution(true);
    setError('');

    try {
      const response = await apiClient.post<{ amount: number }>(`/orders/${orderId}/refund`, {
        reason: selectedReason,
        notes: notes || undefined,
      });

      setSuccess(`Refund issued successfully. Amount: £${response.data.amount?.toFixed(2)}`);
      setRefundModalOpen(false);
      setSelectedReason('');
      setNotes('');
      await reloadOrderData();
    } catch (err: unknown) {
      const e = err as ApiError;
      setError(e?.response?.data?.error || e?.message || 'Failed to issue refund');
    } finally {
      setProcessingResolution(false);
    }
  };

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;

    setUpdating(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.put(`/orders/${order.id}/status`, { status: newStatus });
      setOrder({ ...order, status: newStatus });
      setSuccess(`Order status updated to ${ORDER_STATUS_LABELS[newStatus]}`);
    } catch (err: unknown) {
      const e = err as ApiError;
      setError(e?.error || e?.message || 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const handleProcessPendingIssue = async () => {
    if (!selectedPendingIssue) return;

    setProcessingResolution(true);
    setError('');

    try {
      const response = await apiClient.post(
        `/admin/resolutions/${selectedPendingIssue.id}/process`,
        {
          action: processAction,
          notes: notes || undefined,
        }
      );

      if (processAction === 'REPRINT') {
        setSuccess(
          `Reprint order created successfully. New order ID: ${response.data.reprintOrderId.slice(0, 8).toUpperCase()}`
        );
      } else {
        setSuccess(`Refund processed successfully. Amount: £${response.data.amount?.toFixed(2)}`);
      }

      setProcessIssueModalOpen(false);
      setSelectedPendingIssue(null);
      setNotes('');
      await reloadOrderData();
    } catch (err: unknown) {
      const e = err as ApiError;
      setError(e?.response?.data?.error || e?.message || 'Failed to process issue');
    } finally {
      setProcessingResolution(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!cancellationReason) {
      setError('Please select a cancellation reason');
      return;
    }

    setProcessingCancellation(true);
    setError('');

    try {
      const result = await cancellationService.cancelOrder(
        orderId,
        cancellationReason,
        cancellationNotes || undefined,
        processRefund
      );

      setSuccess(
        result.refundAmount
          ? `Order cancelled and £${result.refundAmount.toFixed(2)} refunded successfully`
          : 'Order cancelled successfully'
      );
      setCancelModalOpen(false);
      setCancellationReason('');
      setCancellationNotes('');
      setProcessRefund(true);
      await reloadOrderData();
    } catch (err: unknown) {
      const e = err as ApiError;
      setError(e?.response?.data?.error || e?.message || 'Failed to cancel order');
    } finally {
      setProcessingCancellation(false);
    }
  };

  const handleReviewCancellationRequest = async () => {
    setProcessingCancellation(true);
    setError('');

    try {
      const result = await cancellationService.reviewCancellationRequest(
        orderId,
        reviewAction,
        reviewNotes || undefined,
        processRefund
      );

      if (reviewAction === 'APPROVE') {
        setSuccess(
          result.refundAmount
            ? `Cancellation approved and £${result.refundAmount.toFixed(2)} refunded`
            : 'Cancellation approved'
        );
      } else {
        setSuccess('Cancellation request rejected. Order will continue processing.');
      }

      setReviewCancelRequestModal(false);
      setReviewNotes('');
      setProcessRefund(true);
      await reloadOrderData();
    } catch (err: unknown) {
      const e = err as ApiError;
      setError(e?.response?.data?.error || e?.message || 'Failed to review cancellation request');
    } finally {
      setProcessingCancellation(false);
    }
  };

  const handleCopyShareLink = useCallback(async () => {
    if (!order?.shareToken) return;

    const shareUrl = `${window.location.origin}/track/order/${order.shareToken}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [order?.shareToken]);

  // Modal openers
  const openReprintModal = () => {
    setSelectedReason('');
    setNotes('');
    setReprintModalOpen(true);
  };

  const openRefundModal = () => {
    setSelectedReason('');
    setNotes('');
    setRefundModalOpen(true);
  };

  const openProcessIssueModal = (issue: Resolution, action: 'REPRINT' | 'REFUND') => {
    setSelectedPendingIssue(issue);
    setProcessAction(action);
    setNotes('');
    setProcessIssueModalOpen(true);
  };

  const openCancelModal = () => {
    setCancellationReason('');
    setCancellationNotes('');
    setProcessRefund(true);
    setCancelModalOpen(true);
  };

  const openReviewModal = (action: 'APPROVE' | 'REJECT') => {
    setReviewAction(action);
    setReviewNotes('');
    setProcessRefund(true);
    setReviewCancelRequestModal(true);
  };

  // Find pending customer issues
  const pendingIssues = resolutions.filter((r) => r.status === 'PENDING');

  // Guard clauses
  if (user && user.userType !== 'PRINTER_ADMIN') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-md h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push('/admin/orders')}>Back to Orders</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-background">
      <AdminOrderHeader order={order} copied={copied} onCopyShareLink={handleCopyShareLink} />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-500 px-4 py-3 rounded-lg text-sm mb-6">
            {success}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column - Order details */}
          <div className="lg:col-span-2 space-y-6">
            <AdminOrderItems order={order} />
            <AdminShippingSection order={order} />
          </div>

          {/* Right column - Status and actions */}
          <div className="space-y-6">
            <AdminOrderStatus
              order={order}
              updating={updating}
              processingCancellation={processingCancellation}
              onUpdateStatus={handleUpdateStatus}
              onOpenCancelModal={openCancelModal}
              onOpenReviewModal={openReviewModal}
            />

            <AdminIssueResolution
              order={order}
              pendingIssues={pendingIssues}
              onOpenReprintModal={openReprintModal}
              onOpenRefundModal={openRefundModal}
              onOpenProcessIssueModal={openProcessIssueModal}
            />

            <AdminResolutionHistory resolutions={resolutions} />
          </div>
        </div>

        {/* Modals */}
        <ReprintModal
          open={reprintModalOpen}
          onOpenChange={setReprintModalOpen}
          selectedReason={selectedReason}
          onReasonChange={setSelectedReason}
          notes={notes}
          onNotesChange={setNotes}
          onSubmit={handleReprint}
          processing={processingResolution}
        />

        <RefundModal
          open={refundModalOpen}
          onOpenChange={setRefundModalOpen}
          selectedReason={selectedReason}
          onReasonChange={setSelectedReason}
          notes={notes}
          onNotesChange={setNotes}
          onSubmit={handleRefund}
          processing={processingResolution}
          totalPrice={Number(order.totalPrice)}
        />

        <ProcessIssueModal
          open={processIssueModalOpen}
          onOpenChange={setProcessIssueModalOpen}
          selectedIssue={selectedPendingIssue}
          processAction={processAction}
          notes={notes}
          onNotesChange={setNotes}
          onSubmit={handleProcessPendingIssue}
          processing={processingResolution}
          totalPrice={Number(order.totalPrice)}
        />

        <CancelOrderModal
          open={cancelModalOpen}
          onOpenChange={setCancelModalOpen}
          cancellationReason={cancellationReason}
          onReasonChange={setCancellationReason}
          notes={cancellationNotes}
          onNotesChange={setCancellationNotes}
          processRefund={processRefund}
          onProcessRefundChange={setProcessRefund}
          onSubmit={handleCancelOrder}
          processing={processingCancellation}
          totalPrice={Number(order.totalPrice)}
        />

        <ReviewCancellationModal
          open={reviewCancelRequestModal}
          onOpenChange={setReviewCancelRequestModal}
          order={order}
          reviewAction={reviewAction}
          notes={reviewNotes}
          onNotesChange={setReviewNotes}
          processRefund={processRefund}
          onProcessRefundChange={setProcessRefund}
          onSubmit={handleReviewCancellationRequest}
          processing={processingCancellation}
        />
      </main>
    </div>
  );
}

export default function AdminOrderDetailsClient({ orderId }: AdminOrderDetailsClientProps) {
  return (
    <ProtectedRoute>
      <AdminOrderDetailsContent orderId={orderId} />
    </ProtectedRoute>
  );
}
