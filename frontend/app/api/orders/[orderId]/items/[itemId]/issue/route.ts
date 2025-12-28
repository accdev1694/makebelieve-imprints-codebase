import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { IssueReason, IssueStatus, CarrierFault } from '@prisma/client';
import { differenceInDays } from 'date-fns';

interface RouteParams {
  params: Promise<{ orderId: string; itemId: string }>;
}

const ISSUE_REPORTING_WINDOW_DAYS = 30;

/**
 * POST /api/orders/[orderId]/items/[itemId]/issue
 * Customer reports an issue on a specific order item
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { orderId, itemId } = await params;

    const body = await request.json();
    const { reason, notes, imageUrls } = body;

    // Validate reason
    if (!reason) {
      return NextResponse.json(
        { error: 'Please select a reason for your issue' },
        { status: 400 }
      );
    }

    const validReasons: IssueReason[] = [
      'DAMAGED_IN_TRANSIT',
      'QUALITY_ISSUE',
      'WRONG_ITEM',
      'PRINTING_ERROR',
      'NEVER_ARRIVED',
      'OTHER',
    ];

    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid reason selected' },
        { status: 400 }
      );
    }

    // Get the order item and verify ownership
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
        issue: true,
        product: true,
        variant: true,
      },
    });

    if (!orderItem) {
      return NextResponse.json(
        { error: 'Order item not found' },
        { status: 404 }
      );
    }

    // Verify the order belongs to this customer
    if (orderItem.order.customerId !== user.userId) {
      return NextResponse.json(
        { error: 'You can only report issues for your own orders' },
        { status: 403 }
      );
    }

    // Verify the order ID matches
    if (orderItem.orderId !== orderId) {
      return NextResponse.json(
        { error: 'Order item does not belong to this order' },
        { status: 400 }
      );
    }

    // Check order status - can only report issues for shipped/delivered orders
    if (!['shipped', 'delivered'].includes(orderItem.order.status)) {
      return NextResponse.json(
        { error: 'You can only report issues for orders that have been shipped or delivered' },
        { status: 400 }
      );
    }

    // Check time window (30 days from order update which typically is when status changed)
    const orderDate = orderItem.order.updatedAt;
    const daysSinceOrder = differenceInDays(new Date(), orderDate);
    if (daysSinceOrder > ISSUE_REPORTING_WINDOW_DAYS) {
      return NextResponse.json(
        { error: `Issues must be reported within ${ISSUE_REPORTING_WINDOW_DAYS} days of delivery` },
        { status: 400 }
      );
    }

    // Check if this item already has an issue (one issue per item max)
    if (orderItem.issue) {
      return NextResponse.json(
        { error: 'This item already has a reported issue. Please view the existing issue instead.' },
        { status: 400 }
      );
    }

    // Validate imageUrls if provided
    const validatedImageUrls = Array.isArray(imageUrls)
      ? imageUrls.filter((url: unknown) => typeof url === 'string' && url.length > 0)
      : [];

    // Auto-flag carrier fault for DAMAGED_IN_TRANSIT
    const carrierFaultStatus: CarrierFault = reason === 'DAMAGED_IN_TRANSIT'
      ? 'CARRIER_FAULT'
      : 'UNKNOWN';

    // Check if this item is a reprint (has originalIssueId tracking in metadata)
    let originalIssueId: string | null = null;
    if (orderItem.metadata && typeof orderItem.metadata === 'object') {
      const metadata = orderItem.metadata as Record<string, unknown>;
      if (metadata.isReprint && metadata.originalItemId) {
        // Find the original issue that led to this reprint
        const originalItem = await prisma.orderItem.findUnique({
          where: { id: metadata.originalItemId as string },
          include: { issue: true },
        });
        if (originalItem?.issue) {
          originalIssueId = originalItem.issue.id;
        }
      }
    }

    // Create the issue with AWAITING_REVIEW status (auto-transition from SUBMITTED)
    const issue = await prisma.issue.create({
      data: {
        orderItemId: itemId,
        reason: reason as IssueReason,
        status: 'AWAITING_REVIEW' as IssueStatus,
        carrierFault: carrierFaultStatus,
        initialNotes: notes || null,
        imageUrls: validatedImageUrls.length > 0 ? validatedImageUrls : undefined,
        originalIssueId: originalIssueId,
        createdBy: user.userId,
      },
      include: {
        orderItem: {
          include: {
            order: true,
            product: true,
            variant: true,
          },
        },
      },
    });

    // TODO: Send email notification to admin about new issue
    // TODO: Send confirmation email to customer

    return NextResponse.json({
      success: true,
      message: 'Your issue has been reported. Our team will review it and respond within 1-2 business days.',
      issue: {
        id: issue.id,
        status: issue.status,
        reason: issue.reason,
        carrierFault: issue.carrierFault,
        createdAt: issue.createdAt,
      },
    });
  } catch (error) {
    console.error('Report issue error:', error);
    return handleApiError(error);
  }
}

/**
 * GET /api/orders/[orderId]/items/[itemId]/issue
 * Get the issue for a specific order item (if exists)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { orderId, itemId } = await params;

    // Get the order item with issue
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: {
        order: true,
        issue: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!orderItem) {
      return NextResponse.json(
        { error: 'Order item not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (orderItem.order.customerId !== user.userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (orderItem.orderId !== orderId) {
      return NextResponse.json(
        { error: 'Order item does not belong to this order' },
        { status: 400 }
      );
    }

    if (!orderItem.issue) {
      return NextResponse.json(
        { error: 'No issue found for this item' },
        { status: 404 }
      );
    }

    return NextResponse.json({ issue: orderItem.issue });
  } catch (error) {
    console.error('Get item issue error:', error);
    return handleApiError(error);
  }
}
