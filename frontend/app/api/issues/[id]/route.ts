import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { getCustomerIssue, withdrawIssue } from '@/lib/server/issue-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/issues/[id]
 * Get issue detail with all messages
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id: issueId } = await params;

    const { issue, error } = await getCustomerIssue(issueId, user.userId);

    if (error === 'Issue not found') {
      return NextResponse.json({ error }, { status: 404 });
    }
    if (error === 'Access denied') {
      return NextResponse.json({ error }, { status: 403 });
    }

    return NextResponse.json({ issue });
  } catch (error) {
    console.error('Get issue detail error:', error);
    return handleApiError(error);
  }
}

/**
 * DELETE /api/issues/[id]
 * Customer withdraws an issue (only if SUBMITTED or AWAITING_REVIEW)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id: issueId } = await params;

    const result = await withdrawIssue(issueId, user.userId);

    if (!result.success) {
      const status = result.error === 'Issue not found' ? 404
        : result.error === 'Access denied' ? 403
        : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      success: true,
      message: 'Issue has been withdrawn',
    });
  } catch (error) {
    console.error('Withdraw issue error:', error);
    return handleApiError(error);
  }
}
