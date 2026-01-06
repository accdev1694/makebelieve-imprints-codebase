import { NextRequest, NextResponse } from 'next/server';
import { confirmSubscription } from '@/lib/server/subscriber-service';

/**
 * GET /api/subscribers/confirm?token=xxx
 * Confirm subscription via token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    const result = await confirmSubscription(token || '');

    // Always redirect - the result contains the appropriate path
    return NextResponse.redirect(new URL(result.data?.redirectPath || '/subscribe/confirm?error=server_error', request.url));
  } catch (error) {
    console.error('Error confirming subscription:', error);
    return NextResponse.redirect(new URL('/subscribe/confirm?error=server_error', request.url));
  }
}
