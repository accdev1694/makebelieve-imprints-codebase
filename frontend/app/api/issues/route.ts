import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

/**
 * GET /api/issues
 * Get all issues for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    // Get all issues for orders belonging to this customer
    const issues = await prisma.resolution.findMany({
      where: {
        order: {
          customerId: user.userId,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            totalPrice: true,
            status: true,
            createdAt: true,
            previewUrl: true,
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
      },
    });

    return NextResponse.json({ issues });
  } catch (error) {
    console.error('Get user issues error:', error);
    return handleApiError(error);
  }
}
