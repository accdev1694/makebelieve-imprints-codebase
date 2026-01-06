'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  CancellationReason,
  CUSTOMER_CANCELLATION_REASONS,
  CANCELLATION_REASON_LABELS,
  cancellationService,
  ordersService,
} from '@/lib/api/orders';
import type { Order } from './types';

interface CancellationSectionProps {
  order: Order;
  onOrderUpdated: (order: Order) => void;
}

export function CancellationSection({ order, onOrderUpdated }: CancellationSectionProps) {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState<CancellationReason | ''>('');
  const [cancelNotes, setCancelNotes] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const handleRequestCancellation = async () => {
    if (!cancelReason) {
      setCancelError('Please select a reason for cancellation');
      return;
    }

    setSubmittingCancel(true);
    setCancelError('');

    try {
      await cancellationService.requestCancellation(order.id, cancelReason, cancelNotes || undefined);
      setCancelSuccess(true);

      // Reload order to get updated status
      const orderData = await ordersService.get(order.id);
      onOrderUpdated(orderData);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setCancelError(
        error?.response?.data?.error || error?.message || 'Failed to submit cancellation request'
      );
    } finally {
      setSubmittingCancel(false);
    }
  };

  const openCancelModal = () => {
    setCancelReason('');
    setCancelNotes('');
    setCancelError('');
    setCancelSuccess(false);
    setCancelModalOpen(true);
  };

  // Cancellation Request Status Card
  if (order.status === 'cancellation_requested' && order.cancellationRequest) {
    return (
      <Card className="mb-6 border-amber-500/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-amber-500 text-lg flex items-center gap-2">
            {'\u23F8\uFE0F'} Cancellation Requested
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Your cancellation request is being reviewed by our team.
          </p>
          <div className="bg-amber-500/10 rounded-lg p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Reason:</span>{' '}
              <span className="font-medium">
                {CANCELLATION_REASON_LABELS[order.cancellationRequest.reason]}
              </span>
            </p>
            {order.cancellationRequest.notes && (
              <p className="mt-1">
                <span className="text-muted-foreground">Your notes:</span>{' '}
                {order.cancellationRequest.notes}
              </p>
            )}
            <p className="mt-1">
              <span className="text-muted-foreground">Submitted:</span>{' '}
              {new Date(order.cancellationRequest.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            We&apos;ll notify you via email once your request has been reviewed (usually within 24
            hours).
          </p>
        </CardContent>
      </Card>
    );
  }

  // Cancelled Order Info Card
  if (order.status === 'cancelled') {
    return (
      <Card className="mb-6 border-red-500/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-red-500 text-lg flex items-center gap-2">
            {'\u274C'} Order Cancelled
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {order.cancellationReason && (
            <p className="text-sm">
              <span className="text-muted-foreground">Reason:</span>{' '}
              <span className="font-medium">
                {CANCELLATION_REASON_LABELS[order.cancellationReason]}
              </span>
            </p>
          )}
          {order.cancellationNotes && (
            <p className="text-sm">
              <span className="text-muted-foreground">Notes:</span> {order.cancellationNotes}
            </p>
          )}
          {order.refundAmount && (
            <div className="bg-green-500/10 rounded-lg p-3 text-sm">
              <p className="text-green-500 font-medium">
                Refund of &pound;{Number(order.refundAmount).toFixed(2)} has been processed
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This will be credited to your original payment method within 5-10 business days.
              </p>
            </div>
          )}
          {order.cancelledAt && (
            <p className="text-xs text-muted-foreground">
              Cancelled on{' '}
              {new Date(order.cancelledAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Cancel button (to be used in OrderActions)
  const canRequestCancellation =
    ['pending', 'payment_confirmed', 'confirmed'].includes(order.status) &&
    !order.cancellationRequest;

  if (!canRequestCancellation) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full sm:w-auto border-red-500/50 text-red-500 hover:text-red-600"
        onClick={openCancelModal}
      >
        Cancel Order
      </Button>

      {/* Cancel Order Request Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Request Order Cancellation</DialogTitle>
            <DialogDescription>
              Request to cancel order #{order.id.slice(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {cancelSuccess ? (
            <div className="py-6 text-center">
              <div className="text-4xl mb-4">{'\u2713'}</div>
              <h3 className="text-lg font-semibold text-green-500 mb-2">Request Submitted</h3>
              <p className="text-muted-foreground mb-4">
                Your cancellation request has been submitted. We&apos;ll review it and notify you
                via email within 24 hours.
              </p>
              <Button onClick={() => setCancelModalOpen(false)}>Close</Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <div className="bg-amber-500/10 border border-amber-500/50 text-amber-600 px-4 py-3 rounded-lg text-sm">
                  <strong>Note:</strong> Cancellation requests are reviewed by our team. Orders that
                  have already started production may not be cancellable.
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cancel-reason">
                    Why do you want to cancel? <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={cancelReason}
                    onValueChange={(value: string) => setCancelReason(value as CancellationReason)}
                  >
                    <SelectTrigger id="cancel-reason">
                      <SelectValue placeholder="Select reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_CANCELLATION_REASONS.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {CANCELLATION_REASON_LABELS[reason]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cancel-notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="cancel-notes"
                    placeholder="Let us know if there's anything else we should know..."
                    value={cancelNotes}
                    onChange={(e) => setCancelNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {cancelError && (
                  <div className="bg-destructive/10 border border-destructive/50 text-destructive px-3 py-2 rounded-md text-sm">
                    {cancelError}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
                  Keep Order
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRequestCancellation}
                  disabled={!cancelReason}
                  loading={submittingCancel}
                >
                  Request Cancellation
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Export separate components for the status cards
export function CancellationStatusCard({ order }: { order: Order }) {
  if (order.status === 'cancellation_requested' && order.cancellationRequest) {
    return (
      <Card className="mb-6 border-amber-500/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-amber-500 text-lg flex items-center gap-2">
            {'\u23F8\uFE0F'} Cancellation Requested
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Your cancellation request is being reviewed by our team.
          </p>
          <div className="bg-amber-500/10 rounded-lg p-3 text-sm">
            <p>
              <span className="text-muted-foreground">Reason:</span>{' '}
              <span className="font-medium">
                {CANCELLATION_REASON_LABELS[order.cancellationRequest.reason]}
              </span>
            </p>
            {order.cancellationRequest.notes && (
              <p className="mt-1">
                <span className="text-muted-foreground">Your notes:</span>{' '}
                {order.cancellationRequest.notes}
              </p>
            )}
            <p className="mt-1">
              <span className="text-muted-foreground">Submitted:</span>{' '}
              {new Date(order.cancellationRequest.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            We&apos;ll notify you via email once your request has been reviewed (usually within 24
            hours).
          </p>
        </CardContent>
      </Card>
    );
  }

  if (order.status === 'cancelled') {
    return (
      <Card className="mb-6 border-red-500/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-red-500 text-lg flex items-center gap-2">
            {'\u274C'} Order Cancelled
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {order.cancellationReason && (
            <p className="text-sm">
              <span className="text-muted-foreground">Reason:</span>{' '}
              <span className="font-medium">
                {CANCELLATION_REASON_LABELS[order.cancellationReason]}
              </span>
            </p>
          )}
          {order.cancellationNotes && (
            <p className="text-sm">
              <span className="text-muted-foreground">Notes:</span> {order.cancellationNotes}
            </p>
          )}
          {order.refundAmount && (
            <div className="bg-green-500/10 rounded-lg p-3 text-sm">
              <p className="text-green-500 font-medium">
                Refund of &pound;{Number(order.refundAmount).toFixed(2)} has been processed
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This will be credited to your original payment method within 5-10 business days.
              </p>
            </div>
          )}
          {order.cancelledAt && (
            <p className="text-xs text-muted-foreground">
              Cancelled on{' '}
              {new Date(order.cancelledAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}
