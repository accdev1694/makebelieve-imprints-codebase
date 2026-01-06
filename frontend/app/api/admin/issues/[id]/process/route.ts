import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { processIssue } from '@/lib/server/issue-service';
import {
  auditIssueResolution,
  auditReprintCreation,
  extractAuditContext,
  ActorType,
} from '@/lib/server/audit-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/issues/[id]/process
 * Process an approved issue - create reprint order or issue refund
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(request);
    const { id: issueId } = await params;

    const body = await request.json();
    const { refundType, notes } = body as {
      refundType?: 'FULL_REFUND' | 'PARTIAL_REFUND';
      notes?: string;
    };

    const result = await processIssue(issueId, admin.userId, { refundType, notes });

    if (!result.success) {
      const status = result.error === 'Issue not found' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    // Audit logging (non-blocking)
    const auditContext = extractAuditContext(request.headers, {
      userId: admin.userId,
      email: admin.email,
      type: ActorType.ADMIN,
    });

    if (result.reprintOrderId) {
      // For reprints, audit both reprint creation and issue resolution
      auditReprintCreation(
        issueId, // original order id would be in the issue
        result.reprintOrderId,
        auditContext,
        'REPRINT'
      ).catch((err) => console.error('[Audit] Failed to log reprint creation:', err));

      auditIssueResolution(issueId, 'REPRINT', auditContext, {
        reprintOrderId: result.reprintOrderId,
      }).catch((err) => console.error('[Audit] Failed to log issue resolution:', err));
    } else if (result.refundAmount) {
      // For refunds, audit the issue resolution
      auditIssueResolution(issueId, refundType || 'FULL_REFUND', auditContext, {
        refundAmount: result.refundAmount,
      }).catch((err) => console.error('[Audit] Failed to log issue resolution:', err));
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      reprintOrderId: result.reprintOrderId,
      refundAmount: result.refundAmount,
      issue: result.issue,
    });
  } catch (error) {
    console.error('Process issue error:', error);
    return handleApiError(error);
  }
}
