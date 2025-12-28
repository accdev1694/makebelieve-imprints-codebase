import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

/**
 * GET /api/admin/issues/carrier-claims
 * Get all carrier fault issues for insurance claims
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const includeResolved = searchParams.get('includeResolved') === 'true';

    // Build where clause
    const where: Record<string, unknown> = {
      carrierFault: 'CARRIER_FAULT',
    };

    if (!includeResolved) {
      where.status = {
        notIn: ['COMPLETED', 'CLOSED'],
      };
    }

    const issues = await prisma.issue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        orderItem: {
          include: {
            order: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                trackingNumber: true,
                carrier: true,
                totalPrice: true,
                shippingAddress: true,
                customer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            product: {
              select: {
                id: true,
                name: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Transform for claims export
    const claims = issues.map(issue => ({
      issueId: issue.id,
      orderId: issue.orderItem.order.id,
      orderDate: issue.orderItem.order.createdAt,
      trackingNumber: issue.orderItem.order.trackingNumber,
      carrier: issue.orderItem.order.carrier || 'Unknown',
      customerName: issue.orderItem.order.customer.name,
      customerEmail: issue.orderItem.order.customer.email,
      shippingAddress: issue.orderItem.order.shippingAddress,
      productName: issue.orderItem.product?.name || 'Unknown Product',
      variantName: issue.orderItem.variant?.name || null,
      itemPrice: issue.orderItem.totalPrice,
      issueReason: issue.reason,
      issueNotes: issue.initialNotes,
      issueImages: issue.imageUrls,
      issueDate: issue.createdAt,
      status: issue.status,
      resolutionType: issue.resolvedType,
      refundAmount: issue.refundAmount,
    }));

    // Summary stats
    const totalClaimsValue = claims.reduce(
      (sum, claim) => sum + Number(claim.itemPrice),
      0
    );

    const refundedAmount = claims
      .filter(c => c.refundAmount)
      .reduce((sum, claim) => sum + Number(claim.refundAmount), 0);

    return NextResponse.json({
      claims,
      summary: {
        totalClaims: claims.length,
        pendingClaims: claims.filter(c => !['COMPLETED', 'CLOSED'].includes(c.status)).length,
        resolvedClaims: claims.filter(c => ['COMPLETED', 'CLOSED'].includes(c.status)).length,
        totalClaimsValue: totalClaimsValue.toFixed(2),
        refundedAmount: refundedAmount.toFixed(2),
      },
    });
  } catch (error) {
    console.error('Get carrier claims error:', error);
    return handleApiError(error);
  }
}
