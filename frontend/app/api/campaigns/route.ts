import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { CampaignType, CampaignStatus } from '@prisma/client';

// GET /api/campaigns - List all campaigns (admin only)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') as CampaignStatus | null;

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const [campaigns, total] = await Promise.all([
      prisma.emailCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.emailCampaign.count({ where }),
    ]);

    // Get stats
    const [draftCount, sentCount, scheduledCount] = await Promise.all([
      prisma.emailCampaign.count({ where: { status: 'DRAFT' } }),
      prisma.emailCampaign.count({ where: { status: 'SENT' } }),
      prisma.emailCampaign.count({ where: { status: 'SCHEDULED' } }),
    ]);

    // Get active subscriber count
    const activeSubscribers = await prisma.subscriber.count({
      where: { status: 'ACTIVE' },
    });

    return NextResponse.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        draft: draftCount,
        sent: sentCount,
        scheduled: scheduledCount,
        activeSubscribers,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/campaigns - Create a new campaign (admin only)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const {
      name,
      subject,
      previewText,
      content,
      plainText,
      type = 'NEWSLETTER',
      promoId,
      scheduledAt,
    } = body;

    // Validate required fields
    if (!name || !subject || !content) {
      return NextResponse.json(
        { error: 'Name, subject, and content are required' },
        { status: 400 }
      );
    }

    // Validate type
    if (!['NEWSLETTER', 'PROMO', 'ANNOUNCEMENT', 'SEASONAL'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid campaign type' },
        { status: 400 }
      );
    }

    // If promo type, require promoId
    if (type === 'PROMO' && !promoId) {
      return NextResponse.json(
        { error: 'Promo ID is required for promo campaigns' },
        { status: 400 }
      );
    }

    // Validate promo exists if provided
    if (promoId) {
      const promo = await prisma.promo.findUnique({
        where: { id: promoId },
      });
      if (!promo) {
        return NextResponse.json(
          { error: 'Promo not found' },
          { status: 404 }
        );
      }
    }

    const campaign = await prisma.emailCampaign.create({
      data: {
        name,
        subject,
        previewText,
        content,
        plainText,
        type: type as CampaignType,
        promoId,
        status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
