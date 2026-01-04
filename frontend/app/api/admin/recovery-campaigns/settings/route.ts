import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { getRecoverySettings, updateRecoverySettings } from '@/lib/server/recovery-service';

/**
 * GET /api/admin/recovery-campaigns/settings
 * Get recovery automation settings
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const settings = await getRecoverySettings();

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/admin/recovery-campaigns/settings
 * Update recovery automation settings
 */
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();

    const { isPaused } = body;

    if (typeof isPaused !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isPaused must be a boolean' },
        { status: 400 }
      );
    }

    await updateRecoverySettings(isPaused);

    return NextResponse.json({
      success: true,
      data: { isPaused },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
