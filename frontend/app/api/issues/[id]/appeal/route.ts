import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { appealIssue } from '@/lib/server/issue-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/issues/[id]/appeal
 * Customer appeals a rejected issue (one appeal allowed)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id: issueId } = await params;

    const body = await request.json();
    const { reason, imageUrls } = body;

    const result = await appealIssue(issueId, user.userId, reason, imageUrls);

    if (!result.success) {
      const status = result.error === 'Issue not found' ? 404
        : result.error === 'Access denied' ? 403
        : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      success: true,
      message: 'Your appeal has been submitted. Our team will review it and respond within 1-2 business days.',
    });
  } catch (error) {
    console.error('Appeal issue error:', error);
    return handleApiError(error);
  }
}
