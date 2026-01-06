/**
 * Issue Service
 *
 * Re-exports all issue-related functionality from the issues/ module.
 * This file maintains backward compatibility for existing imports.
 *
 * The issue service has been split into focused modules:
 * - issues/types.ts - Shared types
 * - issues/issue-status-machine.ts - Status transition logic and query includes
 * - issues/issue-service.ts - Core issue CRUD operations
 * - issues/issue-message-service.ts - Messaging operations
 * - issues/issue-resolution-service.ts - Resolution handling (review, process, conclude)
 * - issues/issue-stats-service.ts - Statistics and reporting
 */

export * from './issues';
