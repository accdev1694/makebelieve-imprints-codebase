import { prisma } from '@/lib/prisma';
import { sendEmail } from './email';
import { EmailCampaign, Promo } from '@prisma/client';

const APP_NAME = 'MakeBelieve Imprints';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://makebelieveimprints.co.uk';

/**
 * Generate campaign email HTML
 */
export function generateCampaignHtml(
  campaign: EmailCampaign,
  promo?: Promo | null,
  recipientEmail?: string
): string {
  const unsubscribeUrl = `${APP_URL}/unsubscribe?email=${encodeURIComponent(recipientEmail || '')}`;
  const shopUrl = `${APP_URL}/products`;

  // Build promo section if applicable
  let promoSection = '';
  if (promo && campaign.type === 'PROMO') {
    const discountText = promo.discountType === 'PERCENTAGE'
      ? `${promo.discountValue}% OFF`
      : `£${Number(promo.discountValue).toFixed(2)} OFF`;

    promoSection = `
      <div style="background: #f3f4f6; padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">Use code at checkout:</p>
        <p style="margin: 0 0 8px; font-size: 32px; font-weight: bold; color: #6366f1; letter-spacing: 3px;">${promo.code}</p>
        <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1f2937;">${discountText}</p>
        ${promo.expiresAt ? `<p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af;">Valid until ${new Date(promo.expiresAt).toLocaleDateString('en-GB')}</p>` : ''}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${campaign.subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <!-- Header -->
      <div style="background-color: #6366f1; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${APP_NAME}</h1>
      </div>

      <!-- Content -->
      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
        ${campaign.content}

        ${promoSection}

        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${shopUrl}" style="background-color: #6366f1; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #6366f1;">
            Shop Now
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background: #f3f4f6; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; text-align: center;">
        <p style="margin: 0 0 10px; color: #6b7280; font-size: 12px;">
          You're receiving this email because you subscribed to our newsletter.
        </p>
        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
          <a href="${unsubscribeUrl}" style="color: #9ca3af;">Unsubscribe</a> |
          <a href="${APP_URL}" style="color: #9ca3af;">Visit our website</a>
        </p>
        <p style="margin: 10px 0 0; color: #9ca3af; font-size: 12px;">
          &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text version of campaign
 */
export function generateCampaignPlainText(
  campaign: EmailCampaign,
  promo?: Promo | null,
  recipientEmail?: string
): string {
  const unsubscribeUrl = `${APP_URL}/unsubscribe?email=${encodeURIComponent(recipientEmail || '')}`;
  const shopUrl = `${APP_URL}/products`;

  // Strip HTML tags from content
  const plainContent = campaign.content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  let promoSection = '';
  if (promo && campaign.type === 'PROMO') {
    const discountText = promo.discountType === 'PERCENTAGE'
      ? `${promo.discountValue}% OFF`
      : `£${Number(promo.discountValue).toFixed(2)} OFF`;

    promoSection = `
---

YOUR PROMO CODE: ${promo.code}
${discountText}
${promo.expiresAt ? `Valid until ${new Date(promo.expiresAt).toLocaleDateString('en-GB')}` : ''}

---
`;
  }

  return `
${APP_NAME}

${plainContent}

${promoSection}

Shop Now: ${shopUrl}

---

You're receiving this email because you subscribed to our newsletter.
Unsubscribe: ${unsubscribeUrl}

© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
  `.trim();
}

/**
 * Send a campaign to all active subscribers
 */
export async function sendCampaign(campaignId: string): Promise<{
  success: boolean;
  sentCount: number;
  failedCount: number;
  error?: string;
}> {
  // Get campaign
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    return { success: false, sentCount: 0, failedCount: 0, error: 'Campaign not found' };
  }

  if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
    return { success: false, sentCount: 0, failedCount: 0, error: 'Campaign cannot be sent in current status' };
  }

  // Get linked promo if any
  let promo: Promo | null = null;
  if (campaign.promoId) {
    promo = await prisma.promo.findUnique({
      where: { id: campaign.promoId },
    });
  }

  // Get all active subscribers
  const subscribers = await prisma.subscriber.findMany({
    where: { status: 'ACTIVE' },
    select: { email: true },
  });

  if (subscribers.length === 0) {
    return { success: false, sentCount: 0, failedCount: 0, error: 'No active subscribers' };
  }

  // Update campaign to sending status
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: 'SENDING',
      recipientCount: subscribers.length,
    },
  });

  let sentCount = 0;
  let failedCount = 0;

  // Send emails in batches
  const batchSize = 10;
  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map(async (subscriber) => {
        const html = generateCampaignHtml(campaign, promo, subscriber.email);
        const text = campaign.plainText || generateCampaignPlainText(campaign, promo, subscriber.email);

        return sendEmail({
          to: subscriber.email,
          subject: campaign.subject,
          html,
          text,
        });
      })
    );

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        sentCount++;
      } else {
        failedCount++;
      }
    });

    // Small delay between batches to avoid rate limits
    if (i + batchSize < subscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Update campaign with final stats
  await prisma.emailCampaign.update({
    where: { id: campaignId },
    data: {
      status: failedCount === subscribers.length ? 'FAILED' : 'SENT',
      sentAt: new Date(),
      sentCount,
      failedCount,
    },
  });

  return {
    success: failedCount < subscribers.length,
    sentCount,
    failedCount,
  };
}

/**
 * Send a test email for a campaign
 */
export async function sendTestCampaign(
  campaignId: string,
  testEmail: string
): Promise<boolean> {
  const campaign = await prisma.emailCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    return false;
  }

  let promo: Promo | null = null;
  if (campaign.promoId) {
    promo = await prisma.promo.findUnique({
      where: { id: campaign.promoId },
    });
  }

  const html = generateCampaignHtml(campaign, promo, testEmail);
  const text = campaign.plainText || generateCampaignPlainText(campaign, promo, testEmail);

  return sendEmail({
    to: testEmail,
    subject: `[TEST] ${campaign.subject}`,
    html,
    text,
  });
}
