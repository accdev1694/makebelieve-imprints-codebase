import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { IssueStatus, CarrierFault } from '@prisma/client';

/**
 * GET /api/admin/issues
 * List all issues with filtering options
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as IssueStatus | null;
    const carrierFault = searchParams.get('carrierFault') as CarrierFault | null;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (carrierFault) {
      where.carrierFault = carrierFault;
    }

    // Get issues with all related data
    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        orderBy: [
          { status: 'asc' }, // Pending issues first
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
        include: {
          orderItem: {
            include: {
              order: {
                select: {
                  id: true,
                  status: true,
                  createdAt: true,
                  trackingNumber: true,
                  totalPrice: true,
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
                  slug: true,
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
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              sender: true,
              content: true,
              createdAt: true,
              readAt: true,
            },
          },
          _count: {
            select: {
              messages: {
                where: {
                  sender: 'CUSTOMER',
                  readAt: null,
                },
              },
            },
          },
        },
      }),
      prisma.issue.count({ where }),
    ]);

    // Get stats
    const stats = await prisma.issue.groupBy({
      by: ['status'],
      _count: true,
    });

    const carrierFaultCount = await prisma.issue.count({
      where: { carrierFault: 'CARRIER_FAULT' },
    });

    // Transform issues
    const issuesWithUnread = issues.map(issue => ({
      ...issue,
      unreadCount: issue._count.messages,
      latestMessage: issue.messages[0] || null,
      messages: undefined,
      _count: undefined,
    }));

    return NextResponse.json({
      issues: issuesWithUnread,
      total,
      stats: {
        byStatus: stats.reduce((acc, s) => {
          acc[s.status] = s._count;
          return acc;
        }, {} as Record<string, number>),
        carrierFault: carrierFaultCount,
      },
    });
  } catch (error) {
    console.error('Get admin issues error:', error);
    return handleApiError(error);
  }
}
