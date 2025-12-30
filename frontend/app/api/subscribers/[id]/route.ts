import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

// PATCH /api/subscribers/[id] - Update subscriber status (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['ACTIVE', 'PENDING', 'UNSUBSCRIBED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be ACTIVE, PENDING, or UNSUBSCRIBED' },
        { status: 400 }
      );
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { id },
    });

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    // Set appropriate timestamps based on status change
    if (status === 'ACTIVE' && subscriber.status !== 'ACTIVE') {
      updateData.subscribedAt = new Date();
      updateData.confirmToken = null;
    } else if (status === 'UNSUBSCRIBED') {
      updateData.unsubscribedAt = new Date();
      updateData.confirmToken = null;
    }

    const updated = await prisma.subscriber.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      message: `Subscriber status updated to ${status}`,
      subscriber: {
        id: updated.id,
        email: updated.email,
        status: updated.status,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/subscribers/[id] - Delete subscriber (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);

    const { id } = await params;

    const subscriber = await prisma.subscriber.findUnique({
      where: { id },
    });

    if (!subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    await prisma.subscriber.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Subscriber deleted',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
