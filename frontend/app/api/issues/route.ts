import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { getCustomerIssues } from '@/lib/server/issue-service';

/**
 * GET /api/issues
 * Get all issues for the current customer (new per-item issue system)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const result = await getCustomerIssues(user.userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Get user issues error:', error);
    return handleApiError(error);
  }
}
