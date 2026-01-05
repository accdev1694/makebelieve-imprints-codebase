import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { updateIncomeStatus } from '@/lib/server/accounting-service';
import {
  validateTransition,
  STATUS_LABELS,
} from '@/lib/server/order-state-machine';
import {
  auditOrderStatusChange,
  extractAuditContext,
  ActorType,
} from '@/lib/server/audit-service';
import { sendReviewRequestEmail } from '@/lib/server/email';
import { OrderStatus } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/orders/[id]/status
 * Update order status (admin only)
 * Uses centralized state machine for validation
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(request);

    const { id } = await params;
    const body = await request.json();
    const { status, force } = body as { status: OrderStatus; force?: boolean };

    // Get current order to validate transition
    const currentOrder = await prisma.order.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!currentOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Validate transition unless force is specified (admin override)
    if (!force) {
      const validation = validateTransition(currentOrder.status, status);
      if (!validation.valid) {
        return NextResponse.json(
          {
            error: validation.error,
            currentStatus: currentOrder.status,
            currentStatusLabel: STATUS_LABELS[currentOrder.status],
            requestedStatus: status,
            requestedStatusLabel: STATUS_LABELS[status],
          },
          { status: 400 }
        );
      }
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        design: {
          select: {
            id: true,
            title: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Auto-accounting: Update income status when order is delivered
    if (status === 'delivered') {
      try {
        await updateIncomeStatus(id, 'CONFIRMED');
      } catch (accountingError) {
        console.error('Failed to update income status:', accountingError);
      }

      // Send review request email
      try {
        const orderItems = order.items.map(item => ({
          name: item.product?.name || 'Custom Design',
          quantity: item.quantity,
        }));
        await sendReviewRequestEmail(
          order.customer.email,
          order.customer.name,
          order.id,
          orderItems
        );
        console.log(`[Email] Review request email sent for order ${id}`);
      } catch (emailError) {
        console.error('Failed to send review request email:', emailError);
      }
    }

    // Audit: Log status change
    const auditContext = extractAuditContext(request.headers, {
      userId: admin.userId,
      email: admin.email,
      type: ActorType.ADMIN,
    });
    auditOrderStatusChange(
      id,
      currentOrder.status,
      status,
      auditContext,
      force ? { forced: true } : undefined
    ).catch((err) => console.error('[Audit] Failed to log status change:', err));

    return NextResponse.json({
      success: true,
      data: {
        order,
        previousStatus: currentOrder.status,
        newStatus: status,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
