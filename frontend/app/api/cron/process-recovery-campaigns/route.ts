import { NextRequest, NextResponse } from 'next/server';
import {
  findEligibleRecoveryUsers,
  createRecoveryCampaign,
  processRecoveryCampaign,
  markExpiredCampaigns,
  getRecoverySettings,
} from '@/lib/server/recovery-service';

const MAX_CAMPAIGNS_PER_RUN = 50;

/**
 * GET /api/cron/process-recovery-campaigns
 * Daily cron job to:
 * 1. Find users with stale cart/wishlist items
 * 2. Create recovery campaigns with promo codes
 * 3. Send recovery emails
 * 4. Mark expired campaigns
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret - REQUIRED in production
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret && process.env.NODE_ENV === 'production') {
      console.error('[Recovery Cron] CRON_SECRET environment variable is not set');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Recovery Cron] Starting recovery campaign processing...');

    // Check if automation is paused
    const settings = await getRecoverySettings();
    if (settings.isPaused) {
      console.log('[Recovery Cron] Automation is paused, skipping');
      return NextResponse.json({
        message: 'Recovery automation is paused',
        paused: true,
        processed: 0,
      });
    }

    const results = {
      eligibleUsersFound: 0,
      campaignsCreated: 0,
      emailsSent: 0,
      emailsFailed: 0,
      expiredCampaigns: 0,
      errors: [] as string[],
    };

    // Step 1: Mark expired campaigns
    results.expiredCampaigns = await markExpiredCampaigns();

    // Step 2: Find eligible users
    const eligibleUsers = await findEligibleRecoveryUsers();
    results.eligibleUsersFound = eligibleUsers.length;

    console.log(`[Recovery Cron] Found ${eligibleUsers.length} eligible users`);

    // Step 3: Create campaigns and send emails (limit per run)
    const usersToProcess = eligibleUsers.slice(0, MAX_CAMPAIGNS_PER_RUN);

    for (const user of usersToProcess) {
      try {
        // Create campaign with promo
        const campaignId = await createRecoveryCampaign(user);
        results.campaignsCreated++;

        // Send email
        const emailSent = await processRecoveryCampaign(campaignId);
        if (emailSent) {
          results.emailsSent++;
        } else {
          results.emailsFailed++;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`User ${user.userId}: ${errorMsg}`);
        console.error(`[Recovery Cron] Error processing user ${user.userId}:`, error);
      }
    }

    console.log('[Recovery Cron] Completed:', results);

    return NextResponse.json({
      message: `Recovery campaigns processed`,
      ...results,
    });
  } catch (error) {
    console.error('[Recovery Cron] Fatal error:', error);
    return NextResponse.json(
      { error: 'Failed to process recovery campaigns' },
      { status: 500 }
    );
  }
}
