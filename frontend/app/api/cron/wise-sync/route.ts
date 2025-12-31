import { NextRequest, NextResponse } from 'next/server';
import { runScheduledSync } from '@/lib/server/wise-service';

/**
 * Cron endpoint for Wise transaction sync
 *
 * Configure this to run every 5 minutes via:
 * - Vercel Cron
 * - External cron service (cron-job.org, etc.)
 * - Server cron job
 *
 * Add CRON_SECRET to environment and include in request header for security
 */

export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const result = await runScheduledSync();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Wise sync cron error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      },
      { status: 500 }
    );
  }
}

// POST also supported for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
