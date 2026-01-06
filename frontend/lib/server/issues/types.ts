/**
 * Issue Service Types
 *
 * Shared types for the issue/resolution system.
 */

import { IssueStatus, Prisma } from '@prisma/client';

// =============================================================================
// Types
// =============================================================================

export type ReviewAction = 'APPROVE_REPRINT' | 'APPROVE_REFUND' | 'REQUEST_INFO' | 'REJECT';
export type MessageSender = 'CUSTOMER' | 'ADMIN';

export interface IssueFilters {
  status?: IssueStatus;
  carrierFault?: 'CARRIER_FAULT' | 'NOT_CARRIER_FAULT' | 'UNKNOWN';
  limit?: number;
  offset?: number;
}

export interface IssueStats {
  total: number;
  pending: number;
  resolved: number;
  unreadMessages: number;
}

export interface AdminIssueStats {
  byStatus: Record<string, number>;
  carrierFault: number;
}

export interface ReviewResult {
  success: boolean;
  message: string;
  issue?: Prisma.IssueGetPayload<Record<string, never>>;
  error?: string;
}

export interface ProcessResult {
  success: boolean;
  message: string;
  reprintOrderId?: string;
  refundAmount?: number;
  issue?: Prisma.IssueGetPayload<Record<string, never>>;
  error?: string;
}

export interface IssueOperationResult {
  success: boolean;
  issue?: unknown;
  error?: string;
}

export interface MessageOperationResult {
  success: boolean;
  message?: unknown;
  error?: string;
}
