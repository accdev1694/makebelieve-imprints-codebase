import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ trackingNumber: string }>;
}

/**
 * GET /api/shipping/tracking/[trackingNumber]
 * Get tracking information for a shipment
 *
 * Note: This currently returns order status from our database.
 * For real-time tracking, you would integrate with Royal Mail Tracking API
 * (requires separate API access at developer.royalmail.net)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { trackingNumber } = await params;

    if (!trackingNumber) {
      return NextResponse.json(
        { error: 'Tracking number is required' },
        { status: 400 }
      );
    }

    // Find order by tracking number
    const order = await prisma.order.findFirst({
      where: { trackingNumber },
      include: {
        customer: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Tracking number not found' },
        { status: 404 }
      );
    }

    // Map order status to tracking status (lowercase to match client expectations)
    const statusMap: Record<string, { status: string; description: string }> = {
      pending: { status: 'pending', description: 'Order received, awaiting processing' },
      payment_confirmed: { status: 'confirmed', description: 'Payment confirmed, preparing for production' },
      confirmed: { status: 'confirmed', description: 'Order confirmed, preparing for production' },
      printing: { status: 'processing', description: 'Order is being printed' },
      shipped: { status: 'in_transit', description: 'Order has been shipped and is on its way' },
      delivered: { status: 'delivered', description: 'Order has been delivered' },
      cancelled: { status: 'cancelled', description: 'Order was cancelled' },
      refunded: { status: 'refunded', description: 'Order was refunded' },
      cancellation_requested: { status: 'pending_cancellation', description: 'Cancellation requested' },
    };

    const trackingStatus = statusMap[order.status] || statusMap.pending;

    // Build tracking events based on order dates
    const events = [];

    events.push({
      timestamp: order.createdAt.toISOString(),
      status: 'ORDER_PLACED',
      description: 'Order placed',
      location: 'Online',
    });

    if (order.status !== 'pending' && order.status !== 'cancelled') {
      events.push({
        timestamp: order.updatedAt.toISOString(),
        status: trackingStatus.status,
        description: trackingStatus.description,
        location: 'MakeBelieve Imprints',
      });
    }

    // Estimate delivery based on status
    let estimatedDelivery = null;
    if (order.status === 'shipped') {
      // Estimate 3-5 days from shipping
      const shipDate = order.updatedAt;
      const estimated = new Date(shipDate);
      estimated.setDate(estimated.getDate() + 5);
      estimatedDelivery = estimated.toISOString();
    }

    return NextResponse.json({
      success: true,
      data: {
        trackingNumber,
        carrier: order.carrier || 'Royal Mail',
        status: trackingStatus.status,
        statusDescription: trackingStatus.description,
        estimatedDelivery,
        lastUpdated: order.updatedAt.toISOString(),
        events: events.reverse(), // Most recent first
        // Royal Mail tracking link
        trackingUrl: `https://www.royalmail.com/track-your-item#/tracking-results/${trackingNumber}`,
      },
    });
  } catch (error) {
    console.error('Tracking lookup error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve tracking information' },
      { status: 500 }
    );
  }
}
