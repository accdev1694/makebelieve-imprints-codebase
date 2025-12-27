import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { sendCampaign } from '@/lib/server/campaign-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/campaigns/[id]/send - Send campaign to all subscribers (admin only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const result = await sendCampaign(id);

    if (!result.success && result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: result.success,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      message: `Campaign sent to ${result.sentCount} subscribers${result.failedCount > 0 ? ` (${result.failedCount} failed)` : ''}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
