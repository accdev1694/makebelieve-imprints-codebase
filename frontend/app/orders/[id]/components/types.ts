import { Order, OrderItem, OrderStatus } from '@/lib/api/orders';

// Enhanced issue reasons with NEVER_ARRIVED
export const ISSUE_REASONS = [
  { value: 'DAMAGED_IN_TRANSIT', label: 'Damaged in Transit', description: 'Item arrived damaged or broken' },
  { value: 'QUALITY_ISSUE', label: 'Quality Issue', description: 'Print quality not as expected' },
  { value: 'WRONG_ITEM', label: 'Wrong Item', description: 'Received a different item than ordered' },
  { value: 'PRINTING_ERROR', label: 'Printing Error', description: 'Colors, alignment, or image printed incorrectly' },
  { value: 'NEVER_ARRIVED', label: 'Never Arrived', description: 'Item was not received' },
  { value: 'OTHER', label: 'Other', description: 'Another issue not listed above' },
];

// Enhanced status labels for new issue system
export const ISSUE_STATUS_LABELS: Record<string, string> = {
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

export const getIssueStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    SUBMITTED: 'bg-blue-500/10 text-blue-500 border-blue-500/50',
    AWAITING_REVIEW: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50',
    INFO_REQUESTED: 'bg-orange-500/10 text-orange-500 border-orange-500/50',
    APPROVED_REPRINT: 'bg-purple-500/10 text-purple-500 border-purple-500/50',
    APPROVED_REFUND: 'bg-purple-500/10 text-purple-500 border-purple-500/50',
    PROCESSING: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/50',
    COMPLETED: 'bg-green-500/10 text-green-500 border-green-500/50',
    REJECTED: 'bg-red-500/10 text-red-500 border-red-500/50',
    CLOSED: 'bg-muted text-muted-foreground border-border',
  };
  return colors[status] || 'bg-muted text-muted-foreground border-border';
};

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

export const getStatusIcon = (status: OrderStatus): string => {
  const icons: Record<OrderStatus, string> = {
    pending: '\u23F3',
    confirmed: '\u2713',
    payment_confirmed: '\u2713',
    printing: '\uD83D\uDDA8\uFE0F',
    shipped: '\uD83D\uDCE6',
    delivered: '\u2705',
    cancellation_requested: '\u23F8\uFE0F',
    cancelled: '\u274C',
    refunded: '\u21A9\uFE0F',
  };
  return icons[status] || '\u25CB';
};

// New per-item issue interface
export interface ItemIssue {
  id: string;
  orderItemId: string;
  reason: string;
  status: string;
  carrierFault: string;
  initialNotes: string | null;
  imageUrls: string[] | null;
  resolvedType: string | null;
  reprintOrderId: string | null;
  refundAmount: number | null;
  rejectionReason: string | null;
  isConcluded: boolean;
  createdAt: string;
  processedAt: string | null;
  unreadCount?: number;
}

// Extended OrderItem with issue
export interface OrderItemWithIssue extends OrderItem {
  issue?: ItemIssue | null;
}

// Re-export types from orders API
export type { Order, OrderItem, OrderStatus };
