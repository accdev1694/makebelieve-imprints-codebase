import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { CampaignType } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/campaigns/[id] - Get campaign details (admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get linked promo details if any
    let promo = null;
    if (campaign.promoId) {
      promo = await prisma.promo.findUnique({
        where: { id: campaign.promoId },
        select: {
          id: true,
          code: true,
          name: true,
          discountType: true,
          discountValue: true,
          expiresAt: true,
        },
      });
    }

    return NextResponse.json({ campaign, promo });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/campaigns/[id] - Update campaign (admin only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const body = await request.json();
    const {
      name,
      subject,
      previewText,
      content,
      plainText,
      type,
      promoId,
      scheduledAt,
      status,
      isRecurring,
      recurrenceDay,
      recurrenceTime,
    } = body;

    // Check if campaign exists
    const existing = await prisma.emailCampaign.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Don't allow editing sent campaigns
    if (existing.status === 'SENT' || existing.status === 'SENDING') {
      return NextResponse.json(
        { error: 'Cannot edit a campaign that has been sent' },
        { status: 400 }
      );
    }

    // Validate promo if changing
    if (promoId && promoId !== existing.promoId) {
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

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (subject !== undefined) updateData.subject = subject;
    if (previewText !== undefined) updateData.previewText = previewText;
    if (content !== undefined) updateData.content = content;
    if (plainText !== undefined) updateData.plainText = plainText;
    if (type !== undefined) updateData.type = type as CampaignType;
    if (promoId !== undefined) updateData.promoId = promoId;
    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
      // Auto-update status based on schedule (only for non-recurring)
      if (!isRecurring) {
        if (scheduledAt && existing.status === 'DRAFT') {
          updateData.status = 'SCHEDULED';
        } else if (!scheduledAt && existing.status === 'SCHEDULED') {
          updateData.status = 'DRAFT';
        }
      }
    }
    if (status !== undefined) updateData.status = status;

    // Recurring fields
    if (isRecurring !== undefined) {
      updateData.isRecurring = isRecurring;
      if (isRecurring) {
        updateData.recurrenceDay = recurrenceDay;
        updateData.recurrenceTime = recurrenceTime;
        updateData.scheduledAt = null; // Clear one-time schedule
      } else {
        updateData.recurrenceDay = null;
        updateData.recurrenceTime = null;
      }
    }

    const campaign = await prisma.emailCampaign.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/campaigns/[id] - Delete campaign (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const existing = await prisma.emailCampaign.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Don't allow deleting sent campaigns
    if (existing.status === 'SENT') {
      return NextResponse.json(
        { error: 'Cannot delete a sent campaign' },
        { status: 400 }
      );
    }

    await prisma.emailCampaign.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
