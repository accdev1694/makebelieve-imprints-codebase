import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { CarrierFault } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/admin/issues/[id]/carrier-fault
 * Admin sets or updates the carrier fault status for an issue
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: issueId } = await params;

    const body = await request.json();
    const { carrierFault } = body as { carrierFault: CarrierFault };

    // Validate carrier fault value
    const validValues: CarrierFault[] = ['UNKNOWN', 'CARRIER_FAULT', 'NOT_CARRIER_FAULT'];
    if (!carrierFault || !validValues.includes(carrierFault)) {
      return NextResponse.json(
        { error: 'Invalid carrier fault value. Must be UNKNOWN, CARRIER_FAULT, or NOT_CARRIER_FAULT' },
        { status: 400 }
      );
    }

    // Get the issue
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    // Update carrier fault status
    const updatedIssue = await prisma.issue.update({
      where: { id: issueId },
      data: { carrierFault },
    });

    return NextResponse.json({
      success: true,
      message: `Carrier fault status updated to ${carrierFault}`,
      issue: updatedIssue,
    });
  } catch (error) {
    console.error('Update carrier fault error:', error);
    return handleApiError(error);
  }
}
