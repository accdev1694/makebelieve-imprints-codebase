import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { getIssueAdmin } from '@/lib/server/issue-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/issues/[id]
 * Get issue detail with all messages for admin
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: issueId } = await params;

    const { issue, error } = await getIssueAdmin(issueId);

    if (error) {
      return NextResponse.json({ error }, { status: 404 });
    }

    return NextResponse.json({ issue });
  } catch (error) {
    console.error('Get admin issue detail error:', error);
    return handleApiError(error);
  }
}
