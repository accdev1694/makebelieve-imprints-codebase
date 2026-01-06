import { NextRequest, NextResponse } from 'next/server';
import { unsubscribe } from '@/lib/server/subscriber-service';

/**
 * POST /api/subscribers/unsubscribe
 * Unsubscribe from newsletter
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    const result = await unsubscribe(email);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ message: result.message });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return NextResponse.json({ error: 'Failed to unsubscribe. Please try again.' }, { status: 500 });
  }
}
