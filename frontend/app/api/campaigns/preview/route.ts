import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { generateCampaignHtml, generateCampaignPlainText } from '@/lib/server/campaign-service';
import { EmailCampaign, CampaignType, CampaignStatus } from '@prisma/client';

// POST /api/campaigns/preview - Generate preview HTML for a campaign
// Can preview either an existing campaign (by id) or draft content
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { id, content, subject, type, promoId } = body;

    let campaign: EmailCampaign;
    let promo = null;

    if (id) {
      // Preview existing campaign
      const existingCampaign = await prisma.emailCampaign.findUnique({
        where: { id },
      });

      if (!existingCampaign) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }

      campaign = existingCampaign;

      if (campaign.promoId) {
        promo = await prisma.promo.findUnique({
          where: { id: campaign.promoId },
        });
      }
    } else {
      // Preview draft content (not saved yet)
      if (!content || !subject) {
        return NextResponse.json(
          { error: 'Content and subject are required for preview' },
          { status: 400 }
        );
      }

      // Create a temporary campaign object for preview
      campaign = {
        id: 'preview',
        name: 'Preview',
        subject,
        previewText: null,
        content,
        plainText: null,
        type: (type || 'NEWSLETTER') as CampaignType,
        promoId: promoId || null,
        status: 'DRAFT' as CampaignStatus,
        scheduledAt: null,
        sentAt: null,
        isRecurring: false,
        recurrenceDay: null,
        recurrenceTime: null,
        lastSentWeek: null,
        recipientCount: 0,
        sentCount: 0,
        failedCount: 0,
        openCount: 0,
        clickCount: 0,
        bounceCount: 0,
        unsubscribeCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (promoId) {
        promo = await prisma.promo.findUnique({
          where: { id: promoId },
        });
      }
    }

    const html = generateCampaignHtml(campaign, promo, 'preview@example.com');
    const plainText = generateCampaignPlainText(campaign, promo, 'preview@example.com');

    return NextResponse.json({
      html,
      plainText,
      subject: campaign.subject,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
