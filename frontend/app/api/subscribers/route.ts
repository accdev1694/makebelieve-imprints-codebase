import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { subscribe, listSubscribers, SubscriberStatus, SubscriberSource } from '@/lib/server/subscriber-service';

/**
 * POST /api/subscribers
 * Subscribe to newsletter (public)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, source = 'FOOTER' } = body as { email: string; name?: string; source?: SubscriberSource };

    const result = await subscribe(email, name, source);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      { message: result.message },
      { status: result.message?.includes('already subscribed') ? 200 : 201 }
    );
  } catch (error) {
    console.error('Error subscribing:', error);
    return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 });
  }
}

/**
 * GET /api/subscribers
 * List subscribers (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status') as SubscriberStatus | null;
    const search = searchParams.get('search');

    const result = await listSubscribers({
      page,
      limit,
      status: status || undefined,
      search: search || undefined,
    });

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return handleApiError(error);
  }
}
