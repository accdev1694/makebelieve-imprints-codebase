/**
 * Centralized Constants
 *
 * All magic numbers and configuration values should be defined here.
 * Import from this file instead of hardcoding values throughout the codebase.
 */

// ============================================
// Pagination
// ============================================
export const PAGINATION = {
  /** Default number of items per page */
  DEFAULT_LIMIT: 20,
  /** Maximum number of items per page */
  MAX_LIMIT: 100,
} as const;

// ============================================
// Tax / VAT
// ============================================
export const TAX = {
  /** UK VAT standard rate (20%) as decimal for calculations */
  VAT_RATE: 0.20,
  /** UK VAT standard rate as percentage */
  VAT_RATE_PERCENT: 20,
  /** UK VAT reduced rate (5%) */
  VAT_RATE_REDUCED: 5,
  /** Zero VAT rate */
  VAT_RATE_ZERO: 0,
} as const;

// ============================================
// JWT / Authentication
// ============================================
export const JWT = {
  /** Access token expiry duration */
  ACCESS_EXPIRY: '15m',
  /** Refresh token expiry duration */
  REFRESH_EXPIRY: '7d',
} as const;

// ============================================
// Security / Password Hashing
// ============================================
export const SECURITY = {
  /** Bcrypt salt rounds / cost factor */
  BCRYPT_COST: 12,
} as const;

// ============================================
// Rate Limiting
// ============================================
export const RATE_LIMIT = {
  /** Login attempts allowed */
  LOGIN_MAX_REQUESTS: 5,
  /** Login rate limit window in milliseconds (15 minutes) */
  LOGIN_WINDOW_MS: 15 * 60 * 1000,
  /** Registration attempts allowed */
  REGISTER_MAX_REQUESTS: 3,
  /** Registration rate limit window in milliseconds (1 hour) */
  REGISTER_WINDOW_MS: 60 * 60 * 1000,
  /** Forgot password attempts allowed */
  FORGOT_PASSWORD_MAX_REQUESTS: 3,
  /** Forgot password rate limit window in milliseconds (1 hour) */
  FORGOT_PASSWORD_WINDOW_MS: 60 * 60 * 1000,
  /** Subscriber API requests allowed */
  SUBSCRIBERS_MAX_REQUESTS: 5,
  /** Subscriber API rate limit window in milliseconds (1 minute) */
  SUBSCRIBERS_WINDOW_MS: 60 * 1000,
  /** Cleanup store every N requests */
  CLEANUP_INTERVAL: 100,
} as const;

// ============================================
// HTTP / CORS
// ============================================
export const HTTP = {
  /** CORS preflight cache duration in seconds (24 hours) */
  CORS_MAX_AGE: 86400,
  /** HSTS max-age in seconds (1 year) */
  HSTS_MAX_AGE: 31536000,
} as const;

// ============================================
// Token / ID Generation
// ============================================
export const TOKEN_LENGTH = {
  /** Share token length for order tracking */
  SHARE_TOKEN: 16,
  /** Recovery promo code suffix length */
  PROMO_CODE: 7,
} as const;

// ============================================
// Cart
// ============================================
export const CART = {
  /** Maximum quantity per cart item */
  MAX_QUANTITY: 99,
  /** Local storage key for cart */
  STORAGE_KEY: 'mkbl_cart',
  /** Local storage key for cart selection */
  SELECTION_KEY: 'mkbl_cart_selection',
} as const;

// ============================================
// Password Requirements
// ============================================
export const PASSWORD = {
  /** Minimum password length */
  MIN_LENGTH: 8,
  /** Maximum name length for sanitization */
  MAX_NAME_LENGTH: 100,
} as const;

// ============================================
// Order Status Groupings
// ============================================

/**
 * Order statuses considered "archived" (concluded)
 * Used by admin for filtering completed/cancelled orders
 */
export const ARCHIVED_STATUSES = ['delivered', 'cancelled', 'refunded'] as const;

/**
 * Order statuses considered "active" (needs attention)
 * Used by admin for filtering orders requiring action
 */
export const ACTIVE_STATUSES = ['pending', 'confirmed', 'printing', 'shipped'] as const;

/**
 * Tab-based status groupings for customer orders page
 * Maps tab names to arrays of OrderStatus values
 */
export const TAB_STATUS_MAP = {
  in_progress: ['pending', 'payment_confirmed', 'confirmed', 'printing', 'cancellation_requested'],
  shipped: ['shipped'],
  completed: ['delivered'],
  cancelled: ['cancelled', 'refunded'],
} as const;
