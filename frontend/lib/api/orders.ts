import apiClient from './client';
import { PrintSize, Material, Orientation } from './designs';

export type OrderStatus =
  | 'pending'
  | 'payment_confirmed'
  | 'printing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface ShippingAddress {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  country: string;
}

export interface Order {
  id: string;
  customerId: string;
  designId: string;
  printSize: PrintSize;
  material: Material;
  orientation: Orientation;
  printWidth: number;
  printHeight: number;
  previewUrl?: string;
  shippingAddress: ShippingAddress;
  totalPrice: number;
  status: OrderStatus;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
  design?: {
    id: string;
    name: string;
    imageUrl: string;
    previewUrl?: string;
  };
}

export interface CreateOrderData {
  designId: string;
  printSize: PrintSize;
  material: Material;
  orientation: Orientation;
  printWidth: number;
  printHeight: number;
  previewUrl?: string;
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
 * Order status labels for UI display
 */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending Payment',
  payment_confirmed: 'Payment Confirmed',
  printing: 'Printing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
