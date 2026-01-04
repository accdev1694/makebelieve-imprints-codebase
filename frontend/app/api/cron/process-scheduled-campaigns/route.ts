import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendCampaign, sendRecurringCampaign } from '@/lib/server/campaign-service';
import {
  findEligibleRecoveryUsers,
  createRecoveryCampaign,
  processRecoveryCampaign,
  markExpiredCampaigns,
  getRecoverySettings,
} from '@/lib/server/recovery-service';

// Helper to get ISO week number
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// GET /api/cron/process-scheduled-campaigns - Process campaigns due to be sent
// This endpoint is called by Vercel Cron every 5 minutes
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret - REQUIRED in production
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, CRON_SECRET must be set
    if (!cronSecret && process.env.NODE_ENV === 'production') {
      console.error('CRON_SECRET environment variable is not set');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const currentDay = now.getDay(); // 0=Sunday, 1=Monday, etc.
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    const currentWeek = getISOWeek(now);

    const results: Array<{
      campaignId: string;
      name: string;
      type: 'scheduled' | 'recurring';
      success: boolean;
      sentCount?: number;
      failedCount?: number;
      error?: string;
    }> = [];

    // 1. Process one-time SCHEDULED campaigns
    const dueCampaigns = await prisma.emailCampaign.findMany({
      where: {
        status: 'SCHEDULED',
        isRecurring: false,
        scheduledAt: {
          lte: now,
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 3,
    });

    for (const campaign of dueCampaigns) {
      console.log(`Processing scheduled campaign: ${campaign.name} (${campaign.id})`);

      const result = await sendCampaign(campaign.id);

      results.push({
        campaignId: campaign.id,
        name: campaign.name,
        type: 'scheduled',
        success: result.success,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        error: result.error,
      });

      console.log(`Campaign ${campaign.name}: sent=${result.sentCount}, failed=${result.failedCount}`);
    }

    // 2. Process RECURRING campaigns due this week
    const recurringCampaigns = await prisma.emailCampaign.findMany({
      where: {
        isRecurring: true,
        recurrenceDay: currentDay,
        recurrenceTime: {
          lte: currentTime,
        },
        // Only get campaigns not yet sent this week
        OR: [
          { lastSentWeek: null },
          { lastSentWeek: { not: currentWeek } },
        ],
      },
      take: 3,
    });

    for (const campaign of recurringCampaigns) {
      console.log(`Processing recurring campaign: ${campaign.name} (${campaign.id})`);

      const result = await sendRecurringCampaign(campaign.id, currentWeek);

      results.push({
        campaignId: campaign.id,
        name: campaign.name,
        type: 'recurring',
        success: result.success,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        error: result.error,
      });

      console.log(`Recurring ${campaign.name}: sent=${result.sentCount}, failed=${result.failedCount}`);
    }

    // 3. Process recovery campaigns (abandoned cart/wishlist)
    const recoveryStats = { created: 0, sent: 0, expired: 0, skipped: false };

    const recoverySettings = await getRecoverySettings();
    if (recoverySettings.isPaused) {
      console.log('[Recovery] Automation is paused, skipping');
      recoveryStats.skipped = true;
    } else {
      // Mark expired campaigns first
      recoveryStats.expired = await markExpiredCampaigns();

      // Find eligible users and create campaigns
      const eligibleUsers = await findEligibleRecoveryUsers();
      console.log(`[Recovery] Found ${eligibleUsers.length} eligible users`);

      // Limit to 50 per run to avoid timeouts
      const usersToProcess = eligibleUsers.slice(0, 50);

      for (const user of usersToProcess) {
        try {
          const campaignId = await createRecoveryCampaign(user);
          recoveryStats.created++;

          // Send the email immediately
          const sent = await processRecoveryCampaign(campaignId);
          if (sent) {
            recoveryStats.sent++;
          }
        } catch (err) {
          console.error(`[Recovery] Error processing user ${user.userId}:`, err);
        }
      }

      console.log(`[Recovery] Created: ${recoveryStats.created}, Sent: ${recoveryStats.sent}, Expired: ${recoveryStats.expired}`);
    }

    if (results.length === 0 && recoveryStats.created === 0 && recoveryStats.expired === 0) {
      return NextResponse.json({
        message: 'No campaigns to process',
        processed: 0,
        recovery: recoveryStats,
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Processed ${results.length} email campaigns (${successCount} succeeded, ${failCount} failed)`,
      processed: results.length,
      results,
      recovery: recoveryStats,
    });
  } catch (error) {
    console.error('Error processing scheduled campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to process scheduled campaigns' },
      { status: 500 }
    );
  }
}
