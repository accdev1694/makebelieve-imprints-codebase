import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/issues/[id]/appeal
 * Customer appeals a rejected issue (one appeal allowed)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id: issueId } = await params;

    const body = await request.json();
    const { reason, imageUrls } = body;

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please provide a reason for your appeal' },
        { status: 400 }
      );
    }

    // Get issue and verify ownership
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        orderItem: {
          include: {
            order: {
              select: { customerId: true },
            },
          },
        },
      },
    });

    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    if (issue.orderItem.order.customerId !== user.userId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Check if issue is concluded (no further actions allowed)
    if (issue.isConcluded) {
      return NextResponse.json(
        { error: 'This issue has been concluded and cannot be appealed' },
        { status: 400 }
      );
    }

    // Check if issue is in REJECTED status
    if (issue.status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Only rejected issues can be appealed' },
        { status: 400 }
      );
    }

    // Check if already appealed (final rejection)
    if (issue.rejectionFinal) {
      return NextResponse.json(
        { error: 'This issue has already been appealed and the rejection is final' },
        { status: 400 }
      );
    }

    // Validate imageUrls
    const validatedImageUrls = Array.isArray(imageUrls)
      ? imageUrls.filter((url: unknown) => typeof url === 'string' && url.length > 0)
      : [];

    // Create appeal message and update issue status
    await prisma.$transaction([
      // Create the appeal message
      prisma.issueMessage.create({
        data: {
          issueId,
          sender: 'CUSTOMER',
          senderId: user.userId,
          content: `**Appeal:** ${reason.trim()}`,
          imageUrls: validatedImageUrls.length > 0 ? validatedImageUrls : undefined,
        },
      }),
      // Move issue back to awaiting review
      prisma.issue.update({
        where: { id: issueId },
        data: {
          status: 'AWAITING_REVIEW',
          reviewedAt: null, // Reset review timestamp
        },
      }),
    ]);

    // TODO: Send email notification to admin about appeal

    return NextResponse.json({
      success: true,
      message: 'Your appeal has been submitted. Our team will review it and respond within 1-2 business days.',
    });
  } catch (error) {
    console.error('Appeal issue error:', error);
    return handleApiError(error);
  }
}
