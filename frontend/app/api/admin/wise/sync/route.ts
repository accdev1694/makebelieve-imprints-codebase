import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { runScheduledSync, getSyncStatus } from '@/lib/server/wise-service';

/**
 * GET /api/admin/wise/sync
 * Get sync status for all accounts
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const accounts = await getSyncStatus();

    return NextResponse.json({
      success: true,
      data: { accounts },
    });
  } catch (error) {
    console.error('Get sync status error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/wise/sync
 * Trigger sync for all accounts
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const result = await runScheduledSync();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Run sync error:', error);
    return NextResponse.json(
      { error: 'Failed to run sync' },
      { status: 500 }
    );
  }
}
