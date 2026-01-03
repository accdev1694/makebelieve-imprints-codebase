/**
 * Audit Service
 * Provides audit trail logging for critical operations
 */

import prisma from '@/lib/prisma';
import {
  AuditAction,
  AuditEntityType,
  ActorType,
  Prisma,
} from '@prisma/client';

export { AuditAction, AuditEntityType, ActorType };

interface AuditContext {
  actorId?: string;
  actorType: ActorType;
  actorEmail?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditLogParams {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  context: AuditContext;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
}

/**
 * Create an audit log entry
 * This is fire-and-forget to not block the main operation
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        actorId: params.context.actorId,
        actorType: params.context.actorType,
        actorEmail: params.context.actorEmail,
        previousState: params.previousState as Prisma.InputJsonValue,
        newState: params.newState as Prisma.InputJsonValue,
        metadata: params.metadata as Prisma.InputJsonValue,
        ipAddress: params.context.ipAddress,
        userAgent: params.context.userAgent,
      },
    });
  } catch (error) {
    // Log but don't throw - audit should never block operations
    console.error('[Audit] Failed to create audit log:', error);
  }
}

/**
 * Create audit log within a transaction
 * Use this when you need the audit to be atomic with other operations
 */
export async function createAuditLogInTransaction(
  tx: Prisma.TransactionClient,
  params: AuditLogParams
): Promise<void> {
  await tx.auditLog.create({
    data: {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      actorId: params.context.actorId,
      actorType: params.context.actorType,
      actorEmail: params.context.actorEmail,
      previousState: params.previousState as Prisma.InputJsonValue,
      newState: params.newState as Prisma.InputJsonValue,
      metadata: params.metadata as Prisma.InputJsonValue,
      ipAddress: params.context.ipAddress,
      userAgent: params.context.userAgent,
    },
  });
}

// ============================================
// CONVENIENCE FUNCTIONS FOR COMMON AUDIT EVENTS
// ============================================

/**
 * Log order status change
 */
export async function auditOrderStatusChange(
  orderId: string,
  previousStatus: string,
  newStatus: string,
  context: AuditContext,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action: AuditAction.ORDER_STATUS_CHANGED,
    entityType: AuditEntityType.ORDER,
    entityId: orderId,
    context,
    previousState: { status: previousStatus },
    newState: { status: newStatus },
    metadata,
  });
}

/**
 * Log order cancellation
 */
export async function auditOrderCancellation(
  orderId: string,
  reason: string,
  context: AuditContext,
  previousStatus?: string
): Promise<void> {
  await createAuditLog({
    action: AuditAction.ORDER_CANCELLED,
    entityType: AuditEntityType.ORDER,
    entityId: orderId,
    context,
    previousState: previousStatus ? { status: previousStatus } : null,
    newState: { status: 'cancelled' },
    metadata: { reason },
  });
}

/**
 * Log refund
 */
export async function auditRefund(
  orderId: string,
  context: AuditContext,
  refundDetails: {
    amount: number;
    stripeRefundId?: string;
    reason?: string;
  }
): Promise<void> {
  await createAuditLog({
    action: AuditAction.ORDER_REFUNDED,
    entityType: AuditEntityType.ORDER,
    entityId: orderId,
    context,
    newState: { status: 'refunded' },
    metadata: refundDetails,
  });
}

/**
 * Log cancellation request review
 */
export async function auditCancellationReview(
  requestId: string,
  orderId: string,
  approved: boolean,
  context: AuditContext,
  notes?: string
): Promise<void> {
  await createAuditLog({
    action: approved ? AuditAction.CANCELLATION_APPROVED : AuditAction.CANCELLATION_REJECTED,
    entityType: AuditEntityType.CANCELLATION_REQUEST,
    entityId: requestId,
    context,
    newState: { status: approved ? 'APPROVED' : 'REJECTED' },
    metadata: { orderId, notes },
  });
}

/**
 * Log issue review
 */
export async function auditIssueReview(
  issueId: string,
  decision: 'approved_reprint' | 'approved_refund' | 'rejected',
  context: AuditContext,
  metadata?: Record<string, unknown>
): Promise<void> {
  let action: AuditAction;
  switch (decision) {
    case 'approved_reprint':
    case 'approved_refund':
      action = AuditAction.ISSUE_REVIEWED;
      break;
    case 'rejected':
      action = AuditAction.ISSUE_REJECTED;
      break;
  }

  await createAuditLog({
    action,
    entityType: AuditEntityType.ISSUE,
    entityId: issueId,
    context,
    newState: { decision },
    metadata,
  });
}

/**
 * Log issue resolution (reprint or refund completed)
 */
export async function auditIssueResolution(
  issueId: string,
  resolutionType: 'REPRINT' | 'FULL_REFUND' | 'PARTIAL_REFUND',
  context: AuditContext,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action: AuditAction.ISSUE_RESOLVED,
    entityType: AuditEntityType.ISSUE,
    entityId: issueId,
    context,
    newState: { status: 'COMPLETED', resolutionType },
    metadata,
  });
}

/**
 * Log reprint creation
 */
export async function auditReprintCreation(
  originalOrderId: string,
  reprintOrderId: string,
  context: AuditContext,
  reason: string
): Promise<void> {
  await createAuditLog({
    action: AuditAction.REPRINT_CREATED,
    entityType: AuditEntityType.ORDER,
    entityId: reprintOrderId,
    context,
    metadata: {
      originalOrderId,
      reason,
    },
  });
}

/**
 * Log webhook processing
 */
export async function auditWebhookProcessed(
  entityType: AuditEntityType,
  entityId: string,
  webhookType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await createAuditLog({
    action: AuditAction.WEBHOOK_PROCESSED,
    entityType,
    entityId,
    context: {
      actorType: ActorType.WEBHOOK,
    },
    metadata: {
      webhookType,
      ...metadata,
    },
  });
}

/**
 * Log payment completion
 */
export async function auditPaymentCompleted(
  orderId: string,
  paymentDetails: {
    stripePaymentId: string;
    amount: number;
    currency: string;
  }
): Promise<void> {
  await createAuditLog({
    action: AuditAction.PAYMENT_COMPLETED,
    entityType: AuditEntityType.PAYMENT,
    entityId: orderId,
    context: {
      actorType: ActorType.WEBHOOK,
    },
    newState: { status: 'COMPLETED' },
    metadata: paymentDetails,
  });
}

// ============================================
// QUERY FUNCTIONS FOR AUDIT LOGS
// ============================================

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogsForEntity(
  entityType: AuditEntityType,
  entityId: string,
  limit = 50
) {
  return prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get recent audit logs by action type
 */
export async function getRecentAuditLogsByAction(
  action: AuditAction,
  limit = 50
) {
  return prisma.auditLog.findMany({
    where: { action },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get audit logs for an actor
 */
export async function getAuditLogsForActor(
  actorId: string,
  limit = 50
) {
  return prisma.auditLog.findMany({
    where: { actorId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Extract audit context from NextRequest headers
 */
export function extractAuditContext(
  headers: Headers,
  actor: { userId?: string; email?: string; type: ActorType }
): AuditContext {
  return {
    actorId: actor.userId,
    actorType: actor.type,
    actorEmail: actor.email,
    ipAddress: headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               headers.get('x-real-ip') ||
               undefined,
    userAgent: headers.get('user-agent') || undefined,
  };
}
