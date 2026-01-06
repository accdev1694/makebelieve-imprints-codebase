import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Resend webhook event types
type ResendEventType =
  | 'email.sent'
  | 'email.delivered'
  | 'email.opened'
  | 'email.clicked'
  | 'email.bounced'
  | 'email.complained'
  | 'email.delivery_delayed';

interface ResendWebhookPayload {
  type: ResendEventType;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // Bounce-specific fields
    bounce?: {
      message: string;
      type?: 'hard' | 'soft';
    };
    // Click-specific fields
    click?: {
      link: string;
      timestamp: string;
    };
  };
}

// Verify Resend webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) return true; // Skip verification if no secret configured

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// POST /api/webhooks/resend - Handle Resend webhook events
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('svix-signature') || '';
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET || '';

    // Verify signature if secret is configured
    if (webhookSecret && !verifySignature(payload, signature, webhookSecret)) {
      console.error('Invalid Resend webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let event: ResendWebhookPayload;
    try {
      event = JSON.parse(payload);
    } catch (parseError) {
      console.error('Failed to parse Resend webhook payload:', parseError);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { type, data } = event;
    const recipientEmail = data.to[0]?.toLowerCase();

    if (!recipientEmail) {
      return NextResponse.json({ received: true, skipped: 'no recipient' });
    }

    console.log(`Resend webhook: ${type} for ${recipientEmail}`);

    switch (type) {
      case 'email.bounced': {
        // Mark subscriber as bounced
        const bounceType = data.bounce?.type || 'unknown';

        const subscriber = await prisma.subscriber.findUnique({
          where: { email: recipientEmail },
        });

        if (subscriber) {
          const newBounceCount = subscriber.bounceCount + 1;

          // Hard bounce or 3+ soft bounces = mark as BOUNCED
          const shouldMarkBounced =
            bounceType === 'hard' || newBounceCount >= 3;

          await prisma.subscriber.update({
            where: { email: recipientEmail },
            data: {
              status: shouldMarkBounced ? 'BOUNCED' : subscriber.status,
              bounceCount: newBounceCount,
              lastBounceAt: new Date(),
              bounceType: bounceType,
            },
          });

          console.log(`Subscriber ${recipientEmail} bounce recorded (${bounceType}, count: ${newBounceCount})`);

          // Increment campaign bounce count for most recent sent campaign
          await incrementCampaignStat('bounceCount');
        }
        break;
      }

      case 'email.complained': {
        // Spam complaint - immediately unsubscribe
        await prisma.subscriber.updateMany({
          where: { email: recipientEmail },
          data: {
            status: 'UNSUBSCRIBED',
            unsubscribedAt: new Date(),
            bounceType: 'complaint',
          },
        });

        console.log(`Subscriber ${recipientEmail} marked as unsubscribed (spam complaint)`);

        await incrementCampaignStat('unsubscribeCount');
        break;
      }

      case 'email.opened': {
        // Track email open
        await incrementCampaignStat('openCount');
        console.log(`Email opened by ${recipientEmail}`);
        break;
      }

      case 'email.clicked': {
        // Track link click
        await incrementCampaignStat('clickCount');
        console.log(`Link clicked by ${recipientEmail}: ${data.click?.link}`);
        break;
      }

      case 'email.delivered':
      case 'email.sent':
      case 'email.delivery_delayed':
        // Log but no action needed
        console.log(`Email ${type} for ${recipientEmail}`);
        break;

      default:
        console.log(`Unhandled Resend event type: ${type}`);
    }

    return NextResponse.json({ received: true, type });
  } catch (error) {
    console.error('Error processing Resend webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Helper to increment stats on the most recently sent campaign
async function incrementCampaignStat(
  field: 'openCount' | 'clickCount' | 'bounceCount' | 'unsubscribeCount'
) {
  try {
    // Find the most recently sent campaign (within last 30 days)
    const recentCampaign = await prisma.emailCampaign.findFirst({
      where: {
        status: 'SENT',
        sentAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      orderBy: { sentAt: 'desc' },
    });

    if (recentCampaign) {
      await prisma.emailCampaign.update({
        where: { id: recentCampaign.id },
        data: {
          [field]: { increment: 1 },
        },
      });
    }
  } catch (error) {
    console.error(`Failed to increment campaign ${field}:`, error);
  }
}
