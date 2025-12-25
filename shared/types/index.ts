/**
 * Shared TypeScript Types
 *
 * These types are shared between the frontend and backend to ensure
 * type safety and consistency across the application.
 */

// ============================================
// USER TYPES
// ============================================

export type UserType = 'customer' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  type: UserType;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  type: UserType;
  profile?: Record<string, unknown>;
}

// ============================================
// AUTH TYPES
// ============================================

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: UserProfile;
  };
  error?: string;
}

// ============================================
// DESIGN TYPES
// ============================================

export type PrintSize = 'A4' | 'A3' | 'A5' | 'SQUARE_20CM' | 'SQUARE_30CM' | 'CUSTOM';

export type Material = 'MATTE' | 'GLOSSY' | 'CANVAS' | 'FINE_ART';

export type Orientation = 'PORTRAIT' | 'LANDSCAPE' | 'SQUARE';

export interface Design {
  id: string;
  userId: string;
  name: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  printSize?: PrintSize;
  material?: Material;
  orientation?: Orientation;
  customWidth?: number;
  customHeight?: number;
  previewUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateDesignData {
  name: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  printSize: PrintSize;
  material: Material;
  orientation: Orientation;
  customWidth?: number;
  customHeight?: number;
}

export type UpdateDesignData = Partial<CreateDesignData>;

// ============================================
// PRODUCT TYPES
// ============================================

export type ProductCategory =
  | 'SUBLIMATION'
  | 'STATIONERY'
  | 'LARGE_FORMAT'
  | 'PHOTO_PRINTS'
  | 'DIGITAL'
  | 'CUSTOM_ORDER';

export type ProductType =
  | 'TSHIRT'
  | 'MUG'
  | 'WATER_BOTTLE'
  | 'MOUSEMAT'
  | 'KEYCHAIN'
  | 'CUSHION_PILLOW'
  | 'BUSINESS_CARD'
  | 'LEAFLET'
  | 'GREETING_CARD'
  | 'POSTCARD'
  | 'BANNER'
  | 'POSTER'
  | 'CANVAS_PRINT'
  | 'ALUMINUM_PRINT'
  | 'PHOTO_PAPER_PRINT'
  | 'ACRYLIC_LED_PRINT'
  | 'DIGITAL_PDF';

export type CustomizationType =
  | 'TEMPLATE_BASED'
  | 'UPLOAD_OWN'
  | 'FULLY_CUSTOM'
  | 'DIGITAL_DOWNLOAD';

export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'OUT_OF_STOCK';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  displayOrder: number;
  isActive: boolean;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ProductImage {
  id: string;
  productId: string;
  variantId?: string;
  imageUrl: string;
  altText?: string;
  displayOrder: number;
  isPrimary: boolean;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  size?: string;
  material?: string;
  color?: string;
  finish?: string;
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
    unit?: string;
  };
  price: number;
  stock: number;
  isDefault: boolean;
  images?: ProductImage[];
}

export interface ProductTemplate {
  id: string;
  productId: string;
  name: string;
  description?: string;
  thumbnailUrl: string;
  designFileUrl: string;
  category?: string;
  tags?: string[];
  isPremium: boolean;
  price?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  subcategoryId?: string;
  category?: Category;
  subcategory?: Subcategory;
  customizationType: CustomizationType;
  basePrice: number;
  currency: string;
  status: ProductStatus;
  featured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  metadata?: Record<string, unknown>;
  variants?: ProductVariant[];
  images?: ProductImage[];
  templates?: ProductTemplate[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// ORDER TYPES
// ============================================

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'printing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface ShippingAddress {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
  phone?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string;
  variantId?: string;
  designId?: string;
  product?: Product;
  variant?: ProductVariant;
  design?: Design;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customization?: Record<string, unknown>;
}

export interface Order {
  id: string;
  customerId: string;
  designId?: string;
  status: OrderStatus;
  printSize?: PrintSize;
  material?: Material;
  orientation?: Orientation;
  printWidth?: number;
  printHeight?: number;
  previewUrl?: string;
  totalPrice: number;
  shippingAddress: ShippingAddress;
  royalmailOrderId?: string;
  trackingNumber?: string;
  carrier?: string;
  items?: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderData {
  designId?: string;
  printSize?: PrintSize;
  material?: Material;
  orientation?: Orientation;
  printWidth?: number;
  printHeight?: number;
  totalPrice: number;
  shippingAddress: ShippingAddress;
  items?: Array<{
    productId?: string;
    variantId?: string;
    designId?: string;
    quantity: number;
    unitPrice: number;
    customization?: Record<string, unknown>;
  }>;
}

// ============================================
// PAYMENT TYPES
// ============================================

export type PaymentMethod = 'STRIPE' | 'PAYPAL' | 'CARD' | 'BANK_TRANSFER' | 'CASH';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  stripePaymentId?: string;
  paypalTransactionId?: string;
  paidAt?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  pdfUrl?: string;
}

// ============================================
// REVIEW TYPES
// ============================================

export interface Review {
  id: string;
  orderId: string;
  reviewerId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface CreateReviewData {
  orderId: string;
  rating: number;
  comment?: string;
}

// ============================================
// SHIPPING/TRACKING TYPES
// ============================================

export type TrackingStatus =
  | 'COLLECTED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'ATTEMPTED_DELIVERY'
  | 'RETURNED'
  | 'EXCEPTION';

export interface TrackingEvent {
  timestamp: string;
  status: TrackingStatus;
  location?: string;
  description: string;
}

export interface TrackingInfo {
  trackingNumber: string;
  carrier: string;
  status: TrackingStatus;
  estimatedDelivery?: string;
  events: TrackingEvent[];
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}
