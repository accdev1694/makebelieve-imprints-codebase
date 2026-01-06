/**
 * Email configuration constants
 */

export const EMAIL_CONFIG = {
  APP_NAME: 'MakeBelieve Imprints',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://makebelieveimprints.co.uk',
  FROM_EMAIL: process.env.EMAIL_FROM || 'MakeBelieve Imprints <noreply@makebelieveimprints.co.uk>',
  SUPPORT_EMAIL: 'admin@makebelieveimprints.co.uk',
} as const;

export const COLORS = {
  // Brand colors
  primary: '#6366f1',      // Indigo - default brand
  success: '#10b981',      // Green - approvals, resolved
  warning: '#f59e0b',      // Amber - action required
  danger: '#ef4444',       // Red - admin alerts, rejections

  // Backgrounds
  bgWhite: '#ffffff',
  bgGray: '#f3f4f6',
  bgGrayLight: '#f9fafb',
  bgSuccess: '#d1fae5',
  bgWarning: '#fef3c7',
  bgDanger: '#fef2f2',

  // Text
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',

  // Borders
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
} as const;

export const STYLES = {
  fontStack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  maxWidth: '600px',
  borderRadius: '8px',
  borderRadiusLg: '10px',
  padding: '30px',
  paddingSm: '20px',
} as const;

/**
 * Format currency for email display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

/**
 * Format order ID for display (first 8 chars uppercase)
 */
export function formatOrderId(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}

/**
 * Get current year for copyright
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}
