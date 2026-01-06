/**
 * Shared Formatting Utilities
 *
 * These utilities are safe to use in both client and server components.
 * Import from this file instead of duplicating formatting logic.
 */

/**
 * Format a number as GBP currency
 */
export function formatCurrency(amount: number, currency: string = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format a date string as a localized UK date
 * @param dateString - ISO date string or date-like string
 * @param options - Optional Intl.DateTimeFormat options
 */
export function formatDate(
  dateString: string | Date,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }
): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-GB', options);
}

/**
 * Format a date as UK format (DD/MM/YYYY)
 */
export function formatDateUK(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date as a short date (e.g., "6 Jan")
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

// ============================================
// Pagination Helpers
// ============================================

/** Default pagination limit */
const DEFAULT_LIMIT = 20;
/** Maximum pagination limit to prevent DoS */
const MAX_LIMIT = 100;

/**
 * Parse and cap pagination parameters from URL search params
 * Prevents unbounded queries that could cause memory exhaustion
 *
 * @param searchParams - URLSearchParams from request
 * @param options - Optional overrides for default/max limits
 * @returns Safe pagination parameters
 */
export function parsePagination(
  searchParams: URLSearchParams,
  options: { defaultLimit?: number; maxLimit?: number } = {}
): { page: number; limit: number; skip: number } {
  const { defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = options;

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const rawLimit = parseInt(searchParams.get('limit') || String(defaultLimit), 10);
  const limit = Math.min(maxLimit, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}
