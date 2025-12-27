import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { createShipment, getCountryCode } from '@/lib/server/royal-mail-service';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/shipping/shipments
 * Create a Royal Mail shipment for an order
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { orderId, weightInGrams, serviceCode } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required' },
        { status: 400 }
      );
    }

    // Fetch the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (!order.shippingAddress) {
      return NextResponse.json(
        { error: 'Order has no shipping address' },
        { status: 400 }
      );
    }

    const shippingAddress = order.shippingAddress as {
      name: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      county?: string;
      postcode: string;
      country: string;
      phone?: string;
    };

    // Determine if international
    const countryCode = getCountryCode(shippingAddress.country);
    const isInternational = countryCode !== 'GB';

    // Build order items for customs (required for international)
    const orderItems = order.items.map((item) => ({
      description: item.product?.name || 'Custom Print Product',
      quantity: item.quantity,
      value: Number(item.unitPrice),
      weight: Math.round((weightInGrams || 500) / order.items.length), // Split weight across items
      countryOfOrigin: 'GB',
    }));

    // Create shipment in Royal Mail
    const { data, error } = await createShipment({
      orderReference: order.id,
      recipient: {
        fullName: shippingAddress.name,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2,
        city: shippingAddress.city,
        county: shippingAddress.county,
        postcode: shippingAddress.postcode,
        countryCode,
        phoneNumber: shippingAddress.phone,
        emailAddress: order.customer.email,
      },
      packages: [
        {
          weightInGrams: weightInGrams || 500, // Default to 500g if not specified
          packageFormatIdentifier: 'parcel',
        },
      ],
      orderItems: isInternational ? orderItems : undefined,
      serviceCode: serviceCode || (isInternational ? 'TPLN' : 'TPN24'), // Tracked 24 for UK, Tracked for international
      customsInfo: isInternational
        ? {
            contentType: 'Sale',
            senderType: 'Business',
          }
        : undefined,
    });

    if (error) {
      console.error('Royal Mail shipment creation failed:', error);
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: 400 }
      );
    }

    // Check for created orders
    if (!data || data.successCount === 0) {
      const errorMessages = data?.failedOrders?.map((f) => f.errors.join(', ')).join('; ');
      return NextResponse.json(
        { error: `Failed to create shipment: ${errorMessages || 'Unknown error'}` },
        { status: 400 }
      );
    }

    const createdOrder = data.createdOrders[0];

    // Update order with Royal Mail order ID
    await prisma.order.update({
      where: { id: orderId },
      data: {
        royalmailOrderId: String(createdOrder.orderIdentifier),
        carrier: 'Royal Mail',
      },
    });

    return NextResponse.json({
      success: true,
      royalMailOrderId: createdOrder.orderIdentifier,
      orderReference: createdOrder.orderReference,
      message: 'Shipment created successfully. You can now generate the label.',
    });
  } catch (error) {
    console.error('Create shipment error:', error);
    return handleApiError(error);
  }
}
