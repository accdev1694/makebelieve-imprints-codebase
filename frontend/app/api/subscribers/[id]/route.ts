import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { updateSubscriberStatus, deleteSubscriber, SubscriberStatus } from '@/lib/server/subscriber-service';

/**
 * PATCH /api/subscribers/[id]
 * Update subscriber status (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);

    const { id } = await params;
    const body = await request.json();
    const { status } = body as { status: SubscriberStatus };

    const result = await updateSubscriberStatus(id, status);

    if (!result.success) {
      const statusCode = result.error === 'Subscriber not found' ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status: statusCode });
    }

    return NextResponse.json({
      message: result.message,
      subscriber: result.data,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/subscribers/[id]
 * Delete subscriber (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);

    const { id } = await params;

    const result = await deleteSubscriber(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ message: result.message });
  } catch (error) {
    return handleApiError(error);
  }
}
