import { NextResponse } from 'next/server';
import { checkHealth } from '@/lib/server/royal-mail-service';

/**
 * GET /api/shipping/health
 * Check Royal Mail API health status
 */
export async function GET() {
  try {
    const health = await checkHealth();

    return NextResponse.json({
      status: health.healthy ? 'healthy' : 'unhealthy',
      provider: 'Royal Mail Click & Drop',
      version: health.version,
      error: health.error,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        provider: 'Royal Mail Click & Drop',
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
