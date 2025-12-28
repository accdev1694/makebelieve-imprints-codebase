import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { renderToBuffer } from '@react-pdf/renderer';
import { ClaimReportPDF } from '@/lib/pdf/claim-report';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/issues/[id]/claim-report
 * Generate a PDF claim report for Royal Mail insurance claim
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: issueId } = await params;

    // Get the issue with all related data
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        orderItem: {
          include: {
            order: {
              include: {
                customer: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            product: true,
            variant: true,
            design: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    // Verify this is a carrier fault issue
    if (issue.carrierFault !== 'CARRIER_FAULT') {
      return NextResponse.json(
        { error: 'This issue is not marked as carrier fault' },
        { status: 400 }
      );
    }

    const order = issue.orderItem.order;
    const orderItem = issue.orderItem;

    // Prepare claim data
    const claimData = {
      // Claim reference (if already submitted)
      claimReference: issue.claimReference,

      // Order details
      orderId: order.id,
      orderDate: order.createdAt,
      trackingNumber: order.trackingNumber || 'N/A',
      carrier: order.carrier || 'Royal Mail',

      // Customer details
      customerName: order.customer.name,
      customerEmail: order.customer.email,
      shippingAddress: order.shippingAddress as {
        name?: string;
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        postcode?: string;
        country?: string;
      } | null,

      // Item details
      productName: orderItem.product?.name || 'Custom Product',
      variantName: orderItem.variant?.name || null,
      quantity: orderItem.quantity,
      itemValue: Number(orderItem.totalPrice),

      // Issue details
      issueId: issue.id,
      issueDate: issue.createdAt,
      issueReason: issue.reason,
      customerStatement: issue.initialNotes || 'No statement provided',
      evidenceImages: (issue.imageUrls as string[]) || [],

      // Resolution
      resolutionType: issue.resolvedType,
      refundAmount: issue.refundAmount ? Number(issue.refundAmount) : null,

      // Messages (customer correspondence)
      messages: issue.messages.map(m => ({
        sender: m.sender,
        content: m.content,
        date: m.createdAt,
      })),
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(ClaimReportPDF({ data: claimData }));

    // Return PDF - convert Buffer to Uint8Array for NextResponse compatibility
    const filename = `claim-report-${order.trackingNumber || issue.id.slice(0, 8)}.pdf`;
    const uint8Array = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Generate claim report error:', error);
    return handleApiError(error);
  }
}
