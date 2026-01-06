import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { listIssuesAdmin } from '@/lib/server/issue-service';
import { IssueStatus, CarrierFault } from '@prisma/client';

/**
 * GET /api/admin/issues
 * List all issues with filtering options
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as IssueStatus | null;
    const carrierFault = searchParams.get('carrierFault') as CarrierFault | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await listIssuesAdmin({
      status: status || undefined,
      carrierFault: carrierFault || undefined,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get admin issues error:', error);
    return handleApiError(error);
  }
}
