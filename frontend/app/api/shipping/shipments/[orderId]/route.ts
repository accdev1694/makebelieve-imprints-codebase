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

    // Delete from Royal Mail (pass as number since orderIdentifier is numeric)
    const { data, error } = await deleteOrders([parseInt(order.royalmailOrderId, 10)]);

    // Check if error is "order not found" - this is OK, order was already deleted in Royal Mail
    // Royal Mail returns 400 with code '2' when order doesn't exist
    const isOrderNotFoundError = error?.message?.includes('does not exist') ||
                                  error?.message?.includes('not found') ||
                                  error?.code === '3' ||
                                  error?.code === '2' ||
                                  error?.code === 'HTTP_400'; // Generic 400 on delete usually means order gone

    if (error && !isOrderNotFoundError) {
      // Real error (network, auth, etc.) - fail
      console.error('Royal Mail delete failed:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (isOrderNotFoundError) {
      console.log('Order already deleted from Royal Mail, clearing local data');
    }

    // Clear shipping fields from database (always do this if we get here)
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
