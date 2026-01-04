import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { RecoveryType, RecoveryCampaignStatus } from '@prisma/client';

/**
 * GET /api/admin/recovery-campaigns
 * List recovery campaigns with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') as RecoveryCampaignStatus | null;
    const type = searchParams.get('type') as RecoveryType | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      status?: RecoveryCampaignStatus;
      type?: RecoveryType;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [campaigns, total] = await Promise.all([
      prisma.recoveryCampaign.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          promo: {
            select: {
              id: true,
              code: true,
              discountValue: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.recoveryCampaign.count({ where }),
    ]);

    const formattedCampaigns = campaigns.map((campaign) => ({
      id: campaign.id,
      user: {
        id: campaign.user.id,
        email: campaign.user.email,
        name: campaign.user.name || campaign.user.email,
      },
      type: campaign.type,
      status: campaign.status,
      itemCount: campaign.triggerItemCount,
      totalValue: campaign.triggerTotalValue ? Number(campaign.triggerTotalValue) : null,
      promoCode: campaign.promoCode,
      discountPercent: campaign.promo ? Number(campaign.promo.discountValue) : null,
      emailSentAt: campaign.emailSentAt?.toISOString() || null,
      convertedAt: campaign.convertedAt?.toISOString() || null,
      recoveredRevenue: campaign.recoveredRevenue ? Number(campaign.recoveredRevenue) : null,
      createdAt: campaign.createdAt.toISOString(),
      expiresAt: campaign.expiresAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        campaigns: formattedCampaigns,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
