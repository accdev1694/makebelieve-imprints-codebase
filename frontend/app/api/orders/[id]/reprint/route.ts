import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { sendReprintConfirmationEmail } from '@/lib/server/email';
import { Prisma } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/orders/[id]/reprint
 * Create a reprint order for a problematic order (admin only)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(request);
    const { id: orderId } = await params;

    const body = await request.json();
    const { reason, notes } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      );
    }

    // Validate reason is one of the allowed values
    const validReasons = [
      'DAMAGED_IN_TRANSIT',
      'QUALITY_ISSUE',
      'WRONG_ITEM',
      'PRINTING_ERROR',
      'OTHER',
    ];
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid reason' },
        { status: 400 }
      );
    }

    // Get the original order with items
    const originalOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            variant: true,
            design: true,
          },
        },
      },
    });

    if (!originalOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Create the reprint order and resolution in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create new order as a free reprint
      const reprintOrder = await tx.order.create({
        data: {
          customerId: originalOrder.customerId,
          designId: originalOrder.designId,
          status: 'confirmed', // Ready for printing immediately
          printSize: originalOrder.printSize,
          material: originalOrder.material,
          orientation: originalOrder.orientation,
          printWidth: originalOrder.printWidth,
          printHeight: originalOrder.printHeight,
          previewUrl: originalOrder.previewUrl,
          subtotal: 0, // Free reprint
          totalPrice: 0, // Free reprint
          shippingAddress: originalOrder.shippingAddress as Prisma.InputJsonValue,
          items: {
            create: originalOrder.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              designId: item.designId,
              quantity: item.quantity,
              unitPrice: 0, // Free
              totalPrice: 0, // Free
              customization: item.customization as Prisma.InputJsonValue | undefined,
              metadata: {
                ...(typeof item.metadata === 'object' && item.metadata !== null
                  ? (item.metadata as Record<string, unknown>)
                  : {}),
                isReprint: true,
                originalOrderId: orderId,
                originalItemId: item.id,
              },
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // Create resolution record
      const resolution = await tx.resolution.create({
        data: {
          orderId: orderId,
          type: 'REPRINT',
          reason: reason,
          notes: notes || null,
          reprintOrderId: reprintOrder.id,
          status: 'COMPLETED',
          createdBy: admin.userId,
          processedAt: new Date(),
        },
      });

      return { reprintOrder, resolution };
    });

    // Send reprint confirmation email to customer
    sendReprintConfirmationEmail(
      originalOrder.customer.email,
      originalOrder.customer.name,
      orderId,
      result.reprintOrder.id,
      reason
    ).catch((error) => {
      console.error('Failed to send reprint confirmation email:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Reprint order created successfully',
      reprintOrderId: result.reprintOrder.id,
      resolutionId: result.resolution.id,
    });
  } catch (error) {
    console.error('Create reprint error:', error);
    return handleApiError(error);
  }
}
