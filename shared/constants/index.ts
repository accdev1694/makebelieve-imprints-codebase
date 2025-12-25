/**
 * Shared Constants
 *
 * These constants are shared between the frontend and backend to ensure
 * consistency across the application.
 */

// ============================================
// FINANCIAL CONSTANTS
// ============================================

/** UK VAT rate (20%) */
export const VAT_RATE = 0.2;

/** Default currency */
export const DEFAULT_CURRENCY = 'GBP';

/** Currency symbols */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
};

// ============================================
// PAGINATION CONSTANTS
// ============================================

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ============================================
// VALIDATION CONSTANTS
// ============================================

/** Password requirements */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Name requirements */
export const NAME_MIN_LENGTH = 1;
export const NAME_MAX_LENGTH = 255;

/** Email max length */
export const EMAIL_MAX_LENGTH = 255;

/** Review constraints */
export const REVIEW_MIN_RATING = 1;
export const REVIEW_MAX_RATING = 5;
export const REVIEW_MAX_COMMENT_LENGTH = 1000;

/** Design constraints */
export const DESIGN_TITLE_MAX_LENGTH = 255;
export const DESIGN_DESCRIPTION_MAX_LENGTH = 1000;

/** Product constraints */
export const PRODUCT_NAME_MAX_LENGTH = 255;
export const PRODUCT_SLUG_MAX_LENGTH = 255;
export const PRODUCT_SEO_TITLE_MAX_LENGTH = 255;
export const PRODUCT_SEO_DESCRIPTION_MAX_LENGTH = 500;

// ============================================
// FILE UPLOAD CONSTANTS
// ============================================

/** Maximum file size in bytes (10MB) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Allowed image MIME types */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

/** Allowed design file MIME types */
export const ALLOWED_DESIGN_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'image/tiff',
];

// ============================================
// ORDER STATUS DISPLAY
// ============================================

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  printing: 'Printing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'yellow',
  confirmed: 'blue',
  printing: 'purple',
  shipped: 'indigo',
  delivered: 'green',
  cancelled: 'red',
};

// ============================================
// PRODUCT CATEGORY DISPLAY
// ============================================

export const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  HOME_LIFESTYLE: 'Home & Lifestyle',
  STATIONERY: 'Stationery',
  LARGE_FORMAT: 'Large Format Prints',
  PHOTO_PRINTS: 'Photo Prints',
  DIGITAL: 'Digital Downloads',
  CUSTOM_ORDER: 'Custom Orders',
};

export const PRODUCT_CATEGORY_SLUGS: Record<string, string> = {
  HOME_LIFESTYLE: 'home-lifestyle',
  STATIONERY: 'stationery',
  LARGE_FORMAT: 'large-format',
  PHOTO_PRINTS: 'photo-prints',
  DIGITAL: 'digital',
  CUSTOM_ORDER: 'custom-order',
};

// ============================================
// PRINT SIZE DIMENSIONS (mm)
// ============================================

export const PRINT_SIZE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  A5: { width: 148, height: 210 },
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  SQUARE_20CM: { width: 200, height: 200 },
  SQUARE_30CM: { width: 300, height: 300 },
};

// ============================================
// MATERIAL LABELS
// ============================================

export const MATERIAL_LABELS: Record<string, string> = {
  MATTE: 'Matte',
  GLOSSY: 'Glossy',
  CANVAS: 'Canvas',
  FINE_ART: 'Fine Art',
};

// ============================================
// TRACKING STATUS LABELS
// ============================================

export const TRACKING_STATUS_LABELS: Record<string, string> = {
  COLLECTED: 'Collected',
  IN_TRANSIT: 'In Transit',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  ATTEMPTED_DELIVERY: 'Attempted Delivery',
  RETURNED: 'Returned',
  EXCEPTION: 'Exception',
};

// ============================================
// PAYMENT STATUS LABELS
// ============================================

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  STRIPE: 'Credit/Debit Card',
  PAYPAL: 'PayPal',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
  CASH: 'Cash',
};

// ============================================
// API PATHS (relative)
// ============================================

export const API_PATHS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
  },
  DESIGNS: {
    BASE: '/designs',
    BY_ID: (id: string) => `/designs/${id}`,
  },
  PRODUCTS: {
    BASE: '/products',
    BY_ID: (id: string) => `/products/${id}`,
    VARIANTS: (id: string) => `/products/${id}/variants`,
    TEMPLATES: (id: string) => `/products/${id}/templates`,
  },
  CATEGORIES: {
    BASE: '/categories',
    BY_ID: (id: string) => `/categories/${id}`,
    SUBCATEGORIES: (id: string) => `/categories/${id}/subcategories`,
  },
  ORDERS: {
    BASE: '/orders',
    BY_ID: (id: string) => `/orders/${id}`,
    STATUS: (id: string) => `/orders/${id}/status`,
    DOWNLOADS: '/orders/user/downloads',
    DOWNLOAD_ITEM: (orderId: string, itemId: string) => `/orders/${orderId}/download/${itemId}`,
  },
  REVIEWS: {
    BASE: '/reviews',
    BY_ID: (id: string) => `/reviews/${id}`,
  },
  INVOICES: {
    BASE: '/invoices',
    BY_ID: (id: string) => `/invoices/${id}`,
    PDF: (id: string) => `/invoices/${id}/pdf`,
  },
  PAYMENTS: {
    BASE: '/payments',
    BY_ID: (id: string) => `/payments/${id}`,
  },
  TEMPLATES: {
    BASE: '/templates',
    BY_ID: (id: string) => `/templates/${id}`,
  },
  SHIPPING: {
    SHIPMENTS: '/shipping/shipments',
    TRACKING: (number: string) => `/shipping/tracking/${number}`,
    HEALTH: '/shipping/health',
  },
  UPLOADS: {
    REQUEST_URL: '/uploads/request-url',
    DOWNLOAD: (key: string) => `/uploads/download/${key}`,
    DELETE: (key: string) => `/uploads/${key}`,
    HEALTH: '/uploads/health',
  },
} as const;

// ============================================
// RATE LIMITS (for display/documentation)
// ============================================

export const RATE_LIMITS = {
  GLOBAL: { requests: 100, windowMinutes: 15 },
  AUTH: { requests: 5, windowMinutes: 15 },
  PAYMENT: { requests: 10, windowMinutes: 60 },
  ORDER: { requests: 10, windowMinutes: 60 },
  UPLOAD: { requests: 20, windowMinutes: 60 },
  PUBLIC: { requests: 200, windowMinutes: 15 },
} as const;
