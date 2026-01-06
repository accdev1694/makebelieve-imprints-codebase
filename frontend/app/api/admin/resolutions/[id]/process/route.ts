import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { createRefund, resolvePaymentIntentId } from '@/lib/server/stripe-service';
import { sendReprintConfirmationEmail, sendRefundConfirmationEmail } from '@/lib/server/email';
import { Prisma } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/resolutions/[id]/process
 * Process a pending customer issue (approve reprint or refund)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const _admin = await requireAdmin(request);
    const { id: resolutionId } = await params;

    const body = await request.json();
    const { action, notes } = body; // action: 'REPRINT' or 'REFUND'

    if (!action || !['REPRINT', 'REFUND'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be REPRINT or REFUND' },
        { status: 400 }
      );
    }

    // Get the pending resolution
    const resolution = await prisma.resolution.findUnique({
      where: { id: resolutionId },
      include: {
        order: {
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
        },
      },
    });

    if (!resolution) {
      return NextResponse.json(
        { error: 'Resolution not found' },
        { status: 404 }
      );
    }

    if (resolution.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'This issue has already been processed' },
        { status: 400 }
      );
    }

    const order = resolution.order;

    if (action === 'REPRINT') {
      // Create a free reprint order
      const result = await prisma.$transaction(async (tx) => {
        // Create new order as a free reprint
        const reprintOrder = await tx.order.create({
          data: {
            customerId: order.customerId,
            designId: order.designId,
            status: 'confirmed',
            printSize: order.printSize,
            material: order.material,
            orientation: order.orientation,
            printWidth: order.printWidth,
            printHeight: order.printHeight,
            previewUrl: order.previewUrl,
            subtotal: 0,
            totalPrice: 0,
            shippingAddress: order.shippingAddress as Prisma.InputJsonValue,
            items: {
              create: order.items.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                designId: item.designId,
                quantity: item.quantity,
                unitPrice: 0,
                totalPrice: 0,
                customization: item.customization as Prisma.InputJsonValue | undefined,
                metadata: {
                  ...(typeof item.metadata === 'object' && item.metadata !== null
                    ? (item.metadata as Record<string, unknown>)
                    : {}),
                  isReprint: true,
                  originalOrderId: order.id,
                  originalItemId: item.id,
                },
              })),
            },
          },
        });

        // Update resolution
        const updatedResolution = await tx.resolution.update({
          where: { id: resolutionId },
          data: {
            type: 'REPRINT',
            reprintOrderId: reprintOrder.id,
            status: 'COMPLETED',
            notes: notes || resolution.notes,
            processedAt: new Date(),
          },
        });

        return { reprintOrder, resolution: updatedResolution };
      });

      // Send email notification
      sendReprintConfirmationEmail(
        order.customer.email,
        order.customer.name,
        order.id,
        result.reprintOrder.id,
        resolution.reason
      ).catch((error) => {
        console.error('Failed to send reprint confirmation email:', error);
      });

      return NextResponse.json({
        success: true,
        message: 'Reprint order created successfully',
        reprintOrderId: result.reprintOrder.id,
      });
    } else {
      // Process refund
      // Get payment info
      const payment = await prisma.payment.findFirst({
        where: {
          orderId: order.id,
          status: 'COMPLETED',
        },
      });

      if (!payment || !payment.stripePaymentId) {
        return NextResponse.json(
          { error: 'No completed payment found for this order' },
          { status: 400 }
        );
      }

      // Resolve the Payment Intent ID - handles both pi_xxx and cs_xxx formats
      // This provides a fallback when the webhook hasn't updated the payment record
      const resolved = await resolvePaymentIntentId(payment.stripePaymentId);

      if (!resolved.paymentIntentId) {
        return NextResponse.json(
          {
            error: `Cannot process refund: ${resolved.error}`,
            suggestion: 'Check Stripe Dashboard to verify the payment status.',
          },
          { status: 400 }
        );
      }

      if (!resolved.isPaid) {
        return NextResponse.json(
          {
            error: 'Cannot process refund: Payment was not completed in Stripe.',
            suggestion: 'Verify the payment status in Stripe Dashboard.',
          },
          { status: 400 }
        );
      }

      // If we resolved from a checkout session, update the local payment record for future use
      if (payment.stripePaymentId.startsWith('cs_')) {
        console.log(`[Resolution] Updating payment record with resolved Payment Intent ID: ${resolved.paymentIntentId}`);
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            stripePaymentId: resolved.paymentIntentId,
            status: 'COMPLETED',
            paidAt: payment.paidAt || new Date(),
          },
        });
      }

      // Update resolution to processing
      await prisma.resolution.update({
        where: { id: resolutionId },
        data: {
          type: 'REFUND',
          status: 'PROCESSING',
          notes: notes || resolution.notes,
        },
      });

      // Create Stripe refund with idempotency key to prevent duplicates
      const refundResult = await createRefund(
        resolved.paymentIntentId,
        'requested_by_customer',
        undefined, // full refund
        `resolution_${resolutionId}` // idempotency key
      );

      if ('error' in refundResult) {
        await prisma.resolution.update({
          where: { id: resolutionId },
          data: {
            status: 'FAILED',
            notes: `${notes || resolution.notes || ''}\nRefund failed: ${refundResult.error}`.trim(),
          },
        });

        return NextResponse.json(
          { error: refundResult.error },
          { status: 400 }
        );
      }

      // Update resolution and order
      await prisma.$transaction([
        prisma.resolution.update({
          where: { id: resolutionId },
          data: {
            type: 'REFUND',
            refundAmount: refundResult.amount,
            stripeRefundId: refundResult.refundId,
            status: 'COMPLETED',
            processedAt: new Date(),
          },
        }),
        prisma.order.update({
          where: { id: order.id },
          data: { status: 'refunded' },
        }),
        prisma.payment.update({
          where: { id: payment.id },
          data: { refundedAt: new Date() },
        }),
      ]);

      // Send email notification
      sendRefundConfirmationEmail(
        order.customer.email,
        order.customer.name,
        order.id,
        refundResult.amount || Number(order.totalPrice),
        resolution.reason
      ).catch((error) => {
        console.error('Failed to send refund confirmation email:', error);
      });

      return NextResponse.json({
        success: true,
        message: 'Refund processed successfully',
        amount: refundResult.amount,
      });
    }
  } catch (error) {
    console.error('Process resolution error:', error);
    return handleApiError(error);
  }
}
