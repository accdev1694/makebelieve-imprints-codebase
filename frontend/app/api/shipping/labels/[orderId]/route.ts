import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { getLabel, getOrderByReference } from '@/lib/server/royal-mail-service';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ orderId: string }>;
}

/**
 * GET /api/shipping/labels/[orderId]
 * Get shipping label PDF for an order
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { orderId } = await params;

    // Fetch the order
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
        { error: 'Order has no Royal Mail shipment. Create a shipment first.' },
        { status: 400 }
      );
    }

    // Get the label from Royal Mail
    const { data: labelData, error: labelError } = await getLabel(
      [parseInt(order.royalmailOrderId)],
      {
        includeReturnsLabel: false,
        includeCN: true, // Include customs docs for international
      }
    );

    if (labelError) {
      console.error('Failed to get label:', labelError);

      // Handle 403 - account doesn't have API label access (no OBA)
      if (labelError.code === 'HTTP_403') {
        return NextResponse.json(
          {
            error: 'Label download requires payment in Click & Drop',
            code: 'PAYMENT_REQUIRED',
            clickAndDropUrl: 'https://business.parcel.royalmail.com/orders/',
            message: 'Please pay for postage in Royal Mail Click & Drop to download the label.',
          },
          { status: 402 } // Payment Required
        );
      }

      return NextResponse.json(
        { error: labelError.message },
        { status: 400 }
      );
    }

    if (!labelData) {
      return NextResponse.json(
        { error: 'No label data returned' },
        { status: 500 }
      );
    }

    // Also fetch the Royal Mail order to get tracking number
    const { data: rmOrder } = await getOrderByReference(orderId);

    // Update order with tracking number if available
    if (rmOrder?.trackingNumber && !order.trackingNumber) {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          trackingNumber: rmOrder.trackingNumber,
          status: 'printing', // Move to printing status when label is generated
        },
      });
    }

    // Return PDF (convert Buffer to Uint8Array for NextResponse compatibility)
    return new NextResponse(new Uint8Array(labelData), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="label-${orderId}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Get label error:', error);
    return handleApiError(error);
  }
}
