import apiClient from './client';
import { PrintSize, Material, Orientation } from './designs';
import {
  OrderStatus as SharedOrderStatus,
  ShippingAddress as SharedShippingAddress,
} from '@mkbl/shared';

// Frontend uses slightly different order statuses (payment_confirmed vs confirmed)
// We extend the shared type for backward compatibility
export type OrderStatus = SharedOrderStatus | 'payment_confirmed';

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
  trackingNumber?: string | null;
  createdAt: string;
  updatedAt: string;
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
   */
  async list(page = 1, limit = 20, status?: OrderStatus): Promise<OrdersListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
    });
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
  cancelled: 'Cancelled',
};
