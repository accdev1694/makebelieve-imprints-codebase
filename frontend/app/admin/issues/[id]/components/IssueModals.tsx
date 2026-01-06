'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Lock } from 'lucide-react';
import { Issue, ReviewAction, RefundType } from './types';

interface ReviewModalProps {
  open: boolean;
  action: ReviewAction | null;
  notes: string;
  loading: boolean;
  onNotesChange: (notes: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function ReviewModal({
  open,
  action,
  notes,
  loading,
  onNotesChange,
  onClose,
  onConfirm,
}: ReviewModalProps) {
  const getTitle = () => {
    switch (action) {
      case 'approve_reprint':
        return 'Approve for Reprint';
      case 'approve_refund':
        return 'Approve for Refund';
      case 'request_info':
        return 'Request More Information';
      case 'reject':
        return 'Reject Issue';
      default:
        return '';
    }
  };

  const getDescription = () => {
    switch (action) {
      case 'approve_reprint':
        return 'This will approve the issue for a free reprint.';
      case 'approve_refund':
        return 'This will approve the issue for a refund.';
      case 'request_info':
        return 'Ask the customer for additional information.';
      case 'reject':
        return 'Reject this issue request.';
      default:
        return '';
    }
  };

  const getLabel = () => {
    if (action === 'reject') return 'Rejection Reason (required)';
    if (action === 'request_info') return 'What information do you need? (required)';
    return 'Notes (optional)';
  };

  const getPlaceholder = () => {
    if (action === 'request_info') return 'What information do you need from the customer?';
    if (action === 'reject') return 'Please explain why this issue is being rejected...';
    return 'Add any notes...';
  };

  const getButtonClass = () => {
    switch (action) {
      case 'reject':
        return 'bg-red-500 hover:bg-red-600';
      case 'approve_reprint':
        return 'bg-purple-500 hover:bg-purple-600';
      case 'approve_refund':
        return 'bg-green-500 hover:bg-green-600';
      case 'request_info':
        return 'bg-orange-500 hover:bg-orange-600';
      default:
        return '';
    }
  };

  const isConfirmDisabled = (action === 'reject' || action === 'request_info') && !notes.trim();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="review-notes">{getLabel()}</Label>
          <Textarea
            id="review-notes"
            placeholder={getPlaceholder()}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={3}
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            loading={loading}
            className={getButtonClass()}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ProcessModalProps {
  open: boolean;
  issue: Issue | null;
  refundType: RefundType;
  notes: string;
  loading: boolean;
  onRefundTypeChange: (type: RefundType) => void;
  onNotesChange: (notes: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function ProcessModal({
  open,
  issue,
  refundType,
  notes,
  loading,
  onRefundTypeChange,
  onNotesChange,
  onClose,
  onConfirm,
}: ProcessModalProps) {
  const isReprint = issue?.status === 'APPROVED_REPRINT';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isReprint ? 'Create Reprint Order' : 'Process Refund'}
          </DialogTitle>
          <DialogDescription>
            {isReprint
              ? 'This will create a free reprint order for the customer.'
              : 'This will process the refund through Stripe.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {!isReprint && issue && (
            <div>
              <Label>Refund Type</Label>
              <Select
                value={refundType}
                onValueChange={(value: RefundType) => onRefundTypeChange(value)}
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
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm} loading={loading}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ConcludeModalProps {
  open: boolean;
  reason: string;
  loading: boolean;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConcludeModal({
  open,
  reason,
  loading,
  onReasonChange,
  onClose,
  onConfirm,
}: ConcludeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
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
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={3}
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            loading={loading}
            className="bg-muted-foreground hover:bg-muted-foreground/80"
          >
            <Lock className="w-4 h-4 mr-2" />
            Conclude Issue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
