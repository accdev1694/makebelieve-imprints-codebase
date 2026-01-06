'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Order,
  CancellationReason,
  ADMIN_CANCELLATION_REASONS,
  CANCELLATION_REASON_LABELS,
} from '@/lib/api/orders';
import { Resolution, RESOLUTION_REASONS, getReasonLabel } from './types';

// Reprint Modal
interface ReprintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedReason: string;
  onReasonChange: (reason: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
  processing: boolean;
}

export function ReprintModal({
  open,
  onOpenChange,
  selectedReason,
  onReasonChange,
  notes,
  onNotesChange,
  onSubmit,
  processing,
}: ReprintModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Reprint Order</DialogTitle>
          <DialogDescription>
            Create a free replacement order for this customer. They will be notified via email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reprint-reason">Reason for Reprint</Label>
            <Select value={selectedReason} onValueChange={onReasonChange}>
              <SelectTrigger id="reprint-reason">
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reprint-notes">Notes (Optional)</Label>
            <Textarea
              id="reprint-notes"
              placeholder="Add any additional notes..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!selectedReason} loading={processing}>
            Create Reprint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Refund Modal
interface RefundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedReason: string;
  onReasonChange: (reason: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
  processing: boolean;
  totalPrice: number;
}

export function RefundModal({
  open,
  onOpenChange,
  selectedReason,
  onReasonChange,
  notes,
  onNotesChange,
  onSubmit,
  processing,
  totalPrice,
}: RefundModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue Refund</DialogTitle>
          <DialogDescription>
            Issue a full refund to the customer. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-orange-500/10 border border-orange-500/50 text-orange-600 px-4 py-3 rounded-lg text-sm">
            <strong>Warning:</strong> Refunds are processed via Stripe and cannot be reversed.
            Consider offering a reprint first.
          </div>
          <div className="space-y-2">
            <Label htmlFor="refund-reason">Reason for Refund</Label>
            <Select value={selectedReason} onValueChange={onReasonChange}>
              <SelectTrigger id="refund-reason">
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="refund-notes">Notes (Optional)</Label>
            <Textarea
              id="refund-notes"
              placeholder="Add any additional notes..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
          </div>
          <div className="bg-muted/30 p-3 rounded-lg">
            <p className="text-sm">
              <span className="text-muted-foreground">Refund Amount:</span>{' '}
              <span className="font-bold text-lg">&pound;{totalPrice.toFixed(2)}</span>
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onSubmit}
            disabled={!selectedReason}
            loading={processing}
          >
            Issue Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Process Issue Modal
interface ProcessIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIssue: Resolution | null;
  processAction: 'REPRINT' | 'REFUND';
  notes: string;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
  processing: boolean;
  totalPrice: number;
}

export function ProcessIssueModal({
  open,
  onOpenChange,
  selectedIssue,
  processAction,
  notes,
  onNotesChange,
  onSubmit,
  processing,
  totalPrice,
}: ProcessIssueModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {processAction === 'REPRINT' ? 'Approve Reprint' : 'Issue Refund'}
          </DialogTitle>
          <DialogDescription>
            Process the customer&apos;s reported issue.
          </DialogDescription>
        </DialogHeader>
        {selectedIssue && (
          <div className="space-y-4 py-4">
            <div className="bg-muted/30 p-3 rounded-lg space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Issue Type:</span>{' '}
                <span className="font-medium">{getReasonLabel(selectedIssue.reason)}</span>
              </p>
              {selectedIssue.notes && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Customer Notes:</span>{' '}
                  <span className="italic">&quot;{selectedIssue.notes}&quot;</span>
                </p>
              )}
            </div>

            {processAction === 'REFUND' && (
              <div className="bg-orange-500/10 border border-orange-500/50 text-orange-600 px-4 py-3 rounded-lg text-sm">
                <strong>Warning:</strong> Refunds are processed via Stripe and cannot be reversed.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="process-notes">Admin Notes (Optional)</Label>
              <Textarea
                id="process-notes"
                placeholder="Add any notes about the resolution..."
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
              />
            </div>

            {processAction === 'REFUND' && (
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-sm">
                  <span className="text-muted-foreground">Refund Amount:</span>{' '}
                  <span className="font-bold text-lg">&pound;{totalPrice.toFixed(2)}</span>
                </p>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className={processAction === 'REPRINT' ? 'bg-purple-500 hover:bg-purple-600' : ''}
            variant={processAction === 'REFUND' ? 'destructive' : 'default'}
            onClick={onSubmit}
            loading={processing}
          >
            {processAction === 'REPRINT' ? 'Approve Reprint' : 'Issue Refund'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Cancel Order Modal
interface CancelOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cancellationReason: CancellationReason | '';
  onReasonChange: (reason: CancellationReason) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  processRefund: boolean;
  onProcessRefundChange: (value: boolean) => void;
  onSubmit: () => void;
  processing: boolean;
  totalPrice: number;
}

export function CancelOrderModal({
  open,
  onOpenChange,
  cancellationReason,
  onReasonChange,
  notes,
  onNotesChange,
  processRefund,
  onProcessRefundChange,
  onSubmit,
  processing,
  totalPrice,
}: CancelOrderModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Order</DialogTitle>
          <DialogDescription>
            Cancel this order and optionally issue a refund to the customer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-red-500/10 border border-red-500/50 text-red-600 px-4 py-3 rounded-lg text-sm">
            <strong>Warning:</strong> This action cannot be undone. The customer will be notified via email.
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Cancellation Reason</Label>
            <Select
              value={cancellationReason}
              onValueChange={(value: string) => onReasonChange(value as CancellationReason)}
            >
              <SelectTrigger id="cancel-reason">
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {ADMIN_CANCELLATION_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {CANCELLATION_REASON_LABELS[reason]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancel-notes">Notes for Customer (Optional)</Label>
            <Textarea
              id="cancel-notes"
              placeholder="Add any notes to include in the cancellation email..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
          </div>

          {/* Refund toggle */}
          <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
            <div>
              <p className="text-sm font-medium">Issue Refund</p>
              <p className="text-xs text-muted-foreground">
                Refund &pound;{totalPrice.toFixed(2)} to customer
              </p>
            </div>
            <Button
              variant={processRefund ? 'default' : 'outline'}
              size="sm"
              onClick={() => onProcessRefundChange(!processRefund)}
            >
              {processRefund ? 'Yes' : 'No'}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="destructive"
            onClick={onSubmit}
            disabled={!cancellationReason}
            loading={processing}
          >
            {processRefund ? 'Cancel & Refund' : 'Cancel Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Review Cancellation Request Modal
interface ReviewCancellationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order;
  reviewAction: 'APPROVE' | 'REJECT';
  notes: string;
  onNotesChange: (notes: string) => void;
  processRefund: boolean;
  onProcessRefundChange: (value: boolean) => void;
  onSubmit: () => void;
  processing: boolean;
}

export function ReviewCancellationModal({
  open,
  onOpenChange,
  order,
  reviewAction,
  notes,
  onNotesChange,
  processRefund,
  onProcessRefundChange,
  onSubmit,
  processing,
}: ReviewCancellationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {reviewAction === 'APPROVE' ? 'Approve Cancellation' : 'Reject Cancellation'}
          </DialogTitle>
          <DialogDescription>
            {reviewAction === 'APPROVE'
              ? 'Cancel the order and issue a refund to the customer.'
              : 'Reject the cancellation request. The order will continue processing.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {order.cancellationRequest && (
            <div className="bg-muted/30 p-3 rounded-lg space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Customer Reason:</span>{' '}
                <span className="font-medium">
                  {CANCELLATION_REASON_LABELS[order.cancellationRequest.reason]}
                </span>
              </p>
              {order.cancellationRequest.notes && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Customer Notes:</span>{' '}
                  <span className="italic">&quot;{order.cancellationRequest.notes}&quot;</span>
                </p>
              )}
            </div>
          )}

          {reviewAction === 'APPROVE' && (
            <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
              <div>
                <p className="text-sm font-medium">Issue Refund</p>
                <p className="text-xs text-muted-foreground">
                  Refund &pound;{Number(order.totalPrice).toFixed(2)} to customer
                </p>
              </div>
              <Button
                variant={processRefund ? 'default' : 'outline'}
                size="sm"
                onClick={() => onProcessRefundChange(!processRefund)}
              >
                {processRefund ? 'Yes' : 'No'}
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="review-notes">
              {reviewAction === 'APPROVE' ? 'Notes (Optional)' : 'Rejection Reason'}
            </Label>
            <Textarea
              id="review-notes"
              placeholder={
                reviewAction === 'APPROVE'
                  ? 'Add any notes for the customer...'
                  : 'Explain why the cancellation was rejected...'
              }
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant={reviewAction === 'APPROVE' ? 'default' : 'destructive'}
            className={reviewAction === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' : ''}
            onClick={onSubmit}
            loading={processing}
          >
            {reviewAction === 'APPROVE' ? 'Approve Cancellation' : 'Reject Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
