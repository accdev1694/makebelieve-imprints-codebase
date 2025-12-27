import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { manifestOrders } from '@/lib/server/royal-mail-service';

/**
 * POST /api/shipping/manifest
 * Manifest all eligible orders (prepare for Royal Mail collection)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json().catch(() => ({}));
    const { carrierName } = body;

    const { data, error } = await manifestOrders(carrierName);

    if (error) {
      console.error('Manifest creation failed:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'No manifest data returned' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      manifestNumber: data.manifestNumber,
      hasPdf: !!data.documentPdf,
      message: `Manifest #${data.manifestNumber} created successfully`,
    });
  } catch (error) {
    console.error('Manifest error:', error);
    return handleApiError(error);
  }
}
