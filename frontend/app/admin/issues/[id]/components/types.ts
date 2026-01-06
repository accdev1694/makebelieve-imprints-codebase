// Types and constants for issue management

export type IssueStatus =
  | 'SUBMITTED'
  | 'AWAITING_REVIEW'
  | 'INFO_REQUESTED'
  | 'APPROVED_REPRINT'
  | 'APPROVED_REFUND'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CLOSED';

export type MessageSender = 'CUSTOMER' | 'ADMIN';

export type CarrierFault = 'UNKNOWN' | 'CARRIER_FAULT' | 'NOT_CARRIER_FAULT';

export type ClaimStatus = 'NOT_FILED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';

export type ReviewAction = 'approve_reprint' | 'approve_refund' | 'reject' | 'request_info';

export type RefundType = 'FULL_REFUND' | 'PARTIAL_REFUND';

export interface IssueMessage {
  id: string;
  sender: MessageSender;
  senderId: string;
  content: string;
  imageUrls: string[] | null;
  createdAt: string;
  readAt: string | null;
}

export interface ShippingAddress {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  country: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
}

export interface Payment {
  id: string;
  stripePaymentId: string;
  status: string;
  refundedAt: string | null;
}

export interface Order {
  id: string;
  status: string;
  createdAt: string;
  trackingNumber: string | null;
  carrier: string | null;
  totalPrice: number | string;
  shippingAddress: ShippingAddress;
  customer: Customer;
  payment?: Payment;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
}

export interface Variant {
  id: string;
  name: string;
  size: string | null;
  color: string | null;
}

export interface Design {
  id: string;
  title: string | null;
  previewUrl: string | null;
  fileUrl: string | null;
}

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
  order: Order;
  product: Product | null;
  variant: Variant | null;
  design: Design | null;
}

export interface Issue {
  id: string;
  reason: string;
  status: IssueStatus;
  carrierFault: CarrierFault;
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
  claimStatus: ClaimStatus;
  claimSubmittedAt: string | null;
  claimPayoutAmount: number | null;
  claimPaidAt: string | null;
  claimNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  processedAt: string | null;
  closedAt: string | null;
  orderItem: OrderItem;
  messages: IssueMessage[];
}

// Label mappings
export const REASON_LABELS: Record<string, string> = {
  DAMAGED_IN_TRANSIT: 'Damaged in Transit',
  QUALITY_ISSUE: 'Quality Issue',
  WRONG_ITEM: 'Wrong Item Sent',
  PRINTING_ERROR: 'Printing Error',
  NEVER_ARRIVED: 'Never Arrived',
  OTHER: 'Other',
};

export const STATUS_LABELS: Record<IssueStatus, string> = {
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

export const STATUS_COLORS: Record<IssueStatus, string> = {
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

// Helper to check permissions
export function canReviewIssue(issue: Issue): boolean {
  return !issue.isConcluded && ['AWAITING_REVIEW', 'INFO_REQUESTED'].includes(issue.status);
}

export function canProcessIssue(issue: Issue): boolean {
  return !issue.isConcluded && ['APPROVED_REPRINT', 'APPROVED_REFUND'].includes(issue.status);
}

export function canMessageOnIssue(issue: Issue): boolean {
  return !issue.isConcluded;
}

export function canConcludeIssue(issue: Issue): boolean {
  return !issue.isConcluded;
}

export function canReopenIssue(issue: Issue): boolean {
  return issue.isConcluded;
}
