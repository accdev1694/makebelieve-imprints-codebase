import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { deleteOrders } from '@/lib/server/royal-mail-service';

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

/**
 * DELETE /api/shipping/shipments/[orderId]
 * Delete a shipment from Royal Mail and clear from database
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { orderId } = await params;

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (!order.royalmailOrderId) {
      return NextResponse.json(
        { error: 'Order has no Royal Mail shipment to delete' },
        { status: 400 }
      );
    }

    // Delete from Royal Mail
    const { data, error } = await deleteOrders([order.royalmailOrderId]);

    if (error) {
      console.error('Royal Mail delete failed:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Clear shipping fields from database
    await prisma.order.update({
      where: { id: orderId },
      data: {
        royalmailOrderId: null,
        trackingNumber: null,
        carrier: null,
        status: order.status === 'printing' ? 'confirmed' : order.status,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Shipment deleted successfully',
      deletedOrders: data?.deletedOrders || [],
    });
  } catch (error) {
    console.error('Delete shipment error:', error);
    return handleApiError(error);
  }
}
