import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/issues/[id]
 * Get issue detail with all messages for admin
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id: issueId } = await params;

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
                payment: {
                  select: {
                    id: true,
                    amount: true,
                    status: true,
                    stripePaymentId: true,
                    refundedAt: true,
                  },
                },
                items: {
                  include: {
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
                    issue: {
                      select: {
                        id: true,
                        status: true,
                      },
                    },
                  },
                },
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                basePrice: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                size: true,
                color: true,
                price: true,
              },
            },
            design: {
              select: {
                id: true,
                title: true,
                previewUrl: true,
                fileUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        originalIssue: {
          select: {
            id: true,
            reason: true,
            status: true,
            createdAt: true,
            resolvedType: true,
          },
        },
        childIssues: {
          select: {
            id: true,
            reason: true,
            status: true,
            createdAt: true,
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

    // Mark customer messages as read
    await prisma.issueMessage.updateMany({
      where: {
        issueId: issueId,
        sender: 'CUSTOMER',
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return NextResponse.json({ issue });
  } catch (error) {
    console.error('Get admin issue detail error:', error);
    return handleApiError(error);
  }
}
