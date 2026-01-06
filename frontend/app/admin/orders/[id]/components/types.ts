import { Order, OrderStatus } from '@/lib/api/orders';

// Resolution types
export interface Resolution {
  id: string;
  orderId: string;
  type: 'REPRINT' | 'REFUND';
  reason: string;
  notes: string | null;
  imageUrls: string[] | null;
  reprintOrderId: string | null;
  refundAmount: number | null;
  stripeRefundId: string | null;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  processedAt: string | null;
}

// API error type
export interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  error?: string;
  message?: string;
}

export const RESOLUTION_REASONS = [
  { value: 'DAMAGED_IN_TRANSIT', label: 'Damaged in Transit' },
  { value: 'QUALITY_ISSUE', label: 'Quality Issue' },
  { value: 'WRONG_ITEM', label: 'Wrong Item Sent' },
  { value: 'PRINTING_ERROR', label: 'Printing Error' },
  { value: 'OTHER', label: 'Other' },
];

// Helper functions
export const getStatusColor = (status: OrderStatus): string => {
  const colors: Record<OrderStatus, string> = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50',
    confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
    payment_confirmed: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
    printing: 'bg-purple-500/10 text-purple-500 border-purple-500/50',
    shipped: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/50',
    delivered: 'bg-green-500/10 text-green-500 border-green-500/50',
    cancellation_requested: 'bg-amber-500/10 text-amber-500 border-amber-500/50',
    cancelled: 'bg-red-500/10 text-red-500 border-red-500/50',
    refunded: 'bg-orange-500/10 text-orange-500 border-orange-500/50',
  };
  return colors[status] || 'bg-muted text-muted-foreground border-border';
};

export const getResolutionStatusColor = (status: Resolution['status']): string => {
  const colors: Record<Resolution['status'], string> = {
    PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50',
    PROCESSING: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
    COMPLETED: 'bg-green-500/10 text-green-500 border-green-500/50',
    FAILED: 'bg-red-500/10 text-red-500 border-red-500/50',
  };
  return colors[status];
};

export const getReasonLabel = (reason: string): string => {
  const found = RESOLUTION_REASONS.find((r) => r.value === reason);
  return found?.label || reason;
};

// Modal state type for all modals
export interface ModalState {
  reprintModalOpen: boolean;
  refundModalOpen: boolean;
  processIssueModalOpen: boolean;
  cancelModalOpen: boolean;
  reviewCancelRequestModal: boolean;
}

// Shared props for components that need the order
export interface OrderComponentProps {
  order: Order;
}

// Props for status update handlers
export interface StatusHandlers {
  onUpdateStatus: (status: OrderStatus) => Promise<void>;
  updating: boolean;
}

// Props for cancellation handlers
export interface CancellationHandlers {
  onOpenCancelModal: () => void;
  onOpenReviewModal: (action: 'APPROVE' | 'REJECT') => void;
  processingCancellation: boolean;
}

// Props for resolution handlers
export interface ResolutionHandlers {
  onOpenReprintModal: () => void;
  onOpenRefundModal: () => void;
  onOpenProcessIssueModal: (issue: Resolution, action: 'REPRINT' | 'REFUND') => void;
  processingResolution: boolean;
}
