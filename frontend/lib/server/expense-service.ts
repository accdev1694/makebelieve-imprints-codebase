/**
 * Expense Service
 *
 * This file re-exports all functionality from the accounting module
 * for backward compatibility. New code should import directly from
 * '@/lib/server/accounting' instead.
 *
 * @deprecated Import from '@/lib/server/accounting' instead
 */

// Re-export everything from the accounting module
export * from './accounting';
