/**
 * Issue Service Module
 *
 * Re-exports all issue-related services for backward compatibility.
 * Import from this index to access any issue functionality.
 */

// =============================================================================
// Types
// =============================================================================
export type {
  ReviewAction,
  MessageSender,
  IssueFilters,
  IssueStats,
  AdminIssueStats,
  ReviewResult,
  ProcessResult,
  IssueOperationResult,
  MessageOperationResult,
} from './types';

// =============================================================================
// Status Machine
// =============================================================================
export {
  // Status constants
  WITHDRAWABLE_STATUSES,
  REVIEWABLE_STATUSES,
  PENDING_STATUSES,
  RESOLVED_STATUSES,
  CLOSED_STATUSES,
  PROCESSABLE_STATUSES,
  // Query includes
  ISSUE_INCLUDE_CUSTOMER,
  ISSUE_INCLUDE_ADMIN,
  // Status helpers
  canWithdraw,
  canReview,
  isPending,
  isResolved,
  canProcess,
  isClosed,
} from './issue-status-machine';

// =============================================================================
// Core Issue Service (CRUD)
// =============================================================================
export {
  getCustomerIssue,
  withdrawIssue,
  getIssueAdmin,
} from './issue-service';

// =============================================================================
// Message Service
// =============================================================================
export {
  markMessagesAsRead,
  getIssueMessages,
  markMessageEmailSent,
  sendCustomerMessage,
  sendAdminMessage,
  appealIssue,
} from './issue-message-service';

// =============================================================================
// Resolution Service
// =============================================================================
export {
  reviewIssue,
  processIssue,
  concludeIssue,
  reopenIssue,
} from './issue-resolution-service';

// =============================================================================
// Stats Service
// =============================================================================
export {
  getCustomerIssues,
  listIssuesAdmin,
  getAdminDashboardStats,
  getIssuesNeedingAttention,
  getCustomerUnreadCount,
  getAdminUnreadCount,
} from './issue-stats-service';
