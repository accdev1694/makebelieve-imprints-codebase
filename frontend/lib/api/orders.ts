import apiClient from './client';
import { PrintSize, Material, Orientation } from './designs';
import {
  OrderStatus as SharedOrderStatus,
  ShippingAddress as SharedShippingAddress,
} from '@mkbl/shared';

// Frontend uses slightly different order statuses (payment_confirmed vs confirmed)
// We extend the shared type for backward compatibility
export type OrderStatus = SharedOrderStatus | 'payment_confirmed' | 'cancellation_requested';

// Cancellation types
export type CancelledBy = 'ADMIN' | 'CUSTOMER';

export type CancellationReason =
  | 'OUT_OF_STOCK'
  | 'BUYER_REQUEST'
  | 'FRAUD_SUSPECTED'
  | 'PAYMENT_ISSUE'
  | 'PRODUCTION_ISSUE'
  | 'DUPLICATE_ORDER'
  | 'OTHER';

export type CancellationRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CancellationRequest {
  id: string;
  orderId: string;
  reason: CancellationReason;
  notes?: string | null;
  status: CancellationRequestStatus;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewNotes?: string | null;
}

// Re-export shipping address from shared
export type ShippingAddress = SharedShippingAddress;

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number | string;
  totalPrice: number | string;
  customization?: Record<string, unknown>;
  product?: {
    id: string;
    name: string;
    slug?: string;
    images?: { imageUrl: string }[];
  };
  variant?: {
    id: string;
    name: string;
  };
}

export interface Order {
  id: string;
  customerId: string;
  designId?: string | null;
  printSize?: PrintSize | null;
  material?: Material | null;
  orientation?: Orientation | null;
  printWidth?: number | null;
  printHeight?: number | null;
  previewUrl?: string | null;
  shippingAddress: ShippingAddress;
  totalPrice: number | string;
  status: OrderStatus;
  royalmailOrderId?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  shareToken?: string | null;
  createdAt: string;
  updatedAt: string;
  // Cancellation fields
  cancelledAt?: string | null;
  cancelledBy?: CancelledBy | null;
  cancellationReason?: CancellationReason | null;
  cancellationNotes?: string | null;
  stripeRefundId?: string | null;
  refundAmount?: number | string | null;
  cancellationRequest?: CancellationRequest | null;
  design?: {
    id: string;
    name: string;
    imageUrl: string;
    previewUrl?: string;
  } | null;
  items?: OrderItem[];
}

export interface OrderItemData {
  productId?: string;
  variantId?: string;
  designId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customization?: {
    size?: string;
    color?: string;
    material?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface CreateOrderData {
  // Legacy design-based order
  designId?: string;
  printSize?: PrintSize;
  material?: Material;
  orientation?: Orientation;
  printWidth?: number;
  printHeight?: number;
  previewUrl?: string;
  // Cart-based order with items
  items?: OrderItemData[];
  // Common fields
  shippingAddress: ShippingAddress;
  totalPrice: number;
  // Promo/Discount fields
  subtotal?: number;
  discountAmount?: number;
  promoCode?: string;
  // Points redemption
  pointsToRedeem?: number;
}

export interface OrdersListResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Orders Service
 * Handles all order-related API calls
 */
export const ordersService = {
  /**
   * Create a new order
   */
  async create(data: CreateOrderData): Promise<Order> {
    const response = await apiClient.post<{ success: boolean; data: { order: Order } }>(
      '/orders',
      data
    );
    return response.data.data.order;
  },

  /**
   * Get all orders for current user
   * @param options.status - filter by specific status
   * @param options.tab - filter by tab group ('all', 'in_progress', 'shipped', 'completed', 'cancelled')
   * @param options.sort - sort field ('date', 'price', 'customer', 'city', 'status')
   * @param options.order - sort order ('asc', 'desc')
   * @param options.archived - legacy: if true, returns only archived orders; if false, returns only active orders
   */
  async list(
    page = 1,
    limit = 20,
    options?: { status?: OrderStatus; tab?: OrderTab; sort?: SortField; order?: SortOrder; archived?: boolean }
  ): Promise<OrdersListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (options?.status) {
      params.set('status', options.status);
    }
    if (options?.tab) {
      params.set('tab', options.tab);
    }
    if (options?.sort) {
      params.set('sort', options.sort);
    }
    if (options?.order) {
      params.set('order', options.order);
    }
    if (options?.archived !== undefined) {
      params.set('archived', options.archived.toString());
    }
    const response = await apiClient.get<{ success: boolean; data: OrdersListResponse }>(
      `/orders?${params.toString()}`
    );
    return response.data.data;
  },

  /**
   * Get a specific order by ID
   */
  async get(id: string): Promise<Order> {
    const response = await apiClient.get<{ success: boolean; data: { order: Order } }>(
      `/orders/${id}`
    );
    return response.data.data.order;
  },
};

/**
 * Calculate order total price based on material and size
 */
export const calculateOrderPrice = (material: Material, printSize: PrintSize): number => {
  // Base prices for materials (in GBP)
  const materialPrices: Record<Material, number> = {
    MATTE: 10,
    GLOSSY: 10,
    CANVAS: 25,
    FINE_ART: 40,
  };

  // Size multipliers
  const sizeMultipliers: Record<PrintSize, number> = {
    A5: 0.75,
    A4: 1.0,
    A3: 1.5,
    SQUARE_20CM: 0.8,
    SQUARE_30CM: 1.2,
    CUSTOM: 1.0, // Base multiplier, actual price should be calculated differently
  };

  const basePrice = materialPrices[material];
  const multiplier = sizeMultipliers[printSize];

  return basePrice * multiplier;
};

/**
 * Get print dimensions in cm based on size and orientation
 */
export const getPrintDimensions = (
  printSize: PrintSize,
  orientation: Orientation
): { width: number; height: number } => {
  const sizes: Record<PrintSize, { width: number; height: number }> = {
    A4: { width: 21, height: 29.7 },
    A3: { width: 29.7, height: 42 },
    A5: { width: 14.8, height: 21 },
    SQUARE_20CM: { width: 20, height: 20 },
    SQUARE_30CM: { width: 30, height: 30 },
    CUSTOM: { width: 0, height: 0 }, // Will be provided by user
  };

  let { width, height } = sizes[printSize];

  // Swap dimensions for landscape orientation (if not square)
  if (orientation === 'LANDSCAPE' && width < height) {
    [width, height] = [height, width];
  } else if (orientation === 'PORTRAIT' && width > height) {
    [width, height] = [height, width];
  }

  return { width, height };
};

/**
 * Order status labels for UI display (extended from shared)
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  payment_confirmed: 'Payment Confirmed',
  printing: 'Printing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancellation_requested: 'Cancellation Requested',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const CANCELLATION_REASON_LABELS: Record<CancellationReason, string> = {
  OUT_OF_STOCK: 'Item out of stock',
  BUYER_REQUEST: 'Changed my mind',
  FRAUD_SUSPECTED: 'Payment verification issue',
  PAYMENT_ISSUE: 'Payment processing issue',
  PRODUCTION_ISSUE: 'Production issue',
  DUPLICATE_ORDER: 'Duplicate order',
  OTHER: 'Other reason',
};

// Customer-facing cancellation reasons (subset of all reasons)
export const CUSTOMER_CANCELLATION_REASONS: CancellationReason[] = [
  'BUYER_REQUEST',
  'DUPLICATE_ORDER',
  'OTHER',
];

// Order status categories for filtering (legacy - used by admin page)
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'payment_confirmed',
  'confirmed',
  'printing',
  'shipped',
  'cancellation_requested',
];

export const ARCHIVED_ORDER_STATUSES: OrderStatus[] = [
  'delivered',
  'cancelled',
  'refunded',
];

// Tab-based status groupings for customer orders page
export type OrderTab = 'all' | 'in_progress' | 'shipped' | 'completed' | 'cancelled';

export const ORDER_TAB_LABELS: Record<OrderTab, string> = {
  all: 'All Orders',
  in_progress: 'In Progress',
  shipped: 'Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const IN_PROGRESS_STATUSES: OrderStatus[] = [
  'pending',
  'payment_confirmed',
  'confirmed',
  'printing',
  'cancellation_requested',
];

export const SHIPPED_STATUSES: OrderStatus[] = ['shipped'];

export const COMPLETED_STATUSES: OrderStatus[] = ['delivered'];

export const CANCELLED_STATUSES: OrderStatus[] = ['cancelled', 'refunded'];

export const TAB_STATUS_MAP: Record<Exclude<OrderTab, 'all'>, OrderStatus[]> = {
  in_progress: IN_PROGRESS_STATUSES,
  shipped: SHIPPED_STATUSES,
  completed: COMPLETED_STATUSES,
  cancelled: CANCELLED_STATUSES,
};

// Sort options
export type SortField = 'date' | 'price' | 'customer' | 'city' | 'status';
export type SortOrder = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  order: SortOrder;
  label: string;
}

// Customer sort options (simpler)
export const CUSTOMER_SORT_OPTIONS: SortOption[] = [
  { field: 'date', order: 'desc', label: 'Newest First' },
  { field: 'date', order: 'asc', label: 'Oldest First' },
  { field: 'price', order: 'desc', label: 'Highest Price' },
  { field: 'price', order: 'asc', label: 'Lowest Price' },
];

// Admin sort options (more comprehensive)
export const ADMIN_SORT_OPTIONS: SortOption[] = [
  { field: 'date', order: 'desc', label: 'Newest First' },
  { field: 'date', order: 'asc', label: 'Oldest First' },
  { field: 'price', order: 'desc', label: 'Highest Price' },
  { field: 'price', order: 'asc', label: 'Lowest Price' },
  { field: 'customer', order: 'asc', label: 'Customer A-Z' },
  { field: 'customer', order: 'desc', label: 'Customer Z-A' },
  { field: 'status', order: 'asc', label: 'Status A-Z' },
];

/**
 * Check if an order status is considered archived (concluded)
 */
export const isArchivedStatus = (status: OrderStatus): boolean => {
  return ARCHIVED_ORDER_STATUSES.includes(status);
};

/**
 * Check if an order status is considered active (needs attention)
 */
export const isActiveStatus = (status: OrderStatus): boolean => {
  return ACTIVE_ORDER_STATUSES.includes(status);
};

// Admin cancellation reasons (all reasons)
export const ADMIN_CANCELLATION_REASONS: CancellationReason[] = [
  'OUT_OF_STOCK',
  'BUYER_REQUEST',
  'FRAUD_SUSPECTED',
  'PAYMENT_ISSUE',
  'PRODUCTION_ISSUE',
  'DUPLICATE_ORDER',
  'OTHER',
];

/**
 * Cancellation Service
 * Handles all cancellation-related API calls
 */
export const cancellationService = {
  /**
   * Cancel an order (admin only)
   */
  async cancelOrder(
    orderId: string,
    reason: CancellationReason,
    notes?: string,
    processRefund = true
  ): Promise<{
    orderId: string;
    status: string;
    refundId?: string;
    refundAmount?: number;
    cancelledAt: string;
  }> {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: {
        orderId: string;
        status: string;
        refundId?: string;
        refundAmount?: number;
        cancelledAt: string;
      };
    }>(`/orders/${orderId}/cancel`, {
      reason,
      notes,
      processRefund,
    });
    return response.data.data;
  },

  /**
   * Request cancellation (customer)
   */
  async requestCancellation(
    orderId: string,
    reason: CancellationReason,
    notes?: string
  ): Promise<{
    requestId: string;
    orderId: string;
    status: CancellationRequestStatus;
    createdAt: string;
  }> {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: {
        requestId: string;
        orderId: string;
        status: CancellationRequestStatus;
        createdAt: string;
      };
    }>(`/orders/${orderId}/cancel-request`, {
      reason,
      notes,
    });
    return response.data.data;
  },

  /**
   * Get cancellation request status
   */
  async getCancellationRequest(orderId: string): Promise<CancellationRequest | null> {
    const response = await apiClient.get<{
      success: boolean;
      data: CancellationRequest | null;
    }>(`/orders/${orderId}/cancel-request`);
    return response.data.data;
  },

  /**
   * Review cancellation request (admin only)
   */
  async reviewCancellationRequest(
    orderId: string,
    action: 'APPROVE' | 'REJECT',
    notes?: string,
    processRefund = true
  ): Promise<{
    orderId: string;
    status: string;
    refundId?: string;
    refundAmount?: number;
  }> {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: {
        orderId: string;
        status: string;
        refundId?: string;
        refundAmount?: number;
      };
    }>(`/orders/${orderId}/cancel-request/review`, {
      action,
      notes,
      processRefund,
    });
    return response.data.data;
  },
};
