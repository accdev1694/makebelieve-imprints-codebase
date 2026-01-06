import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionStatus } from '@/lib/server/subscriber-service';

/**
 * GET /api/subscribers/status?email=xxx
 * Check subscription status by email
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    const result = await getSubscriptionStatus(email || '');

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json({ error: 'Failed to check subscription status' }, { status: 500 });
  }
}
