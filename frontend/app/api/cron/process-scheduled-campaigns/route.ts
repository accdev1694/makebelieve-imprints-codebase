import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendCampaign } from '@/lib/server/campaign-service';

// GET /api/cron/process-scheduled-campaigns - Process campaigns due to be sent
// This endpoint is called by Vercel Cron every 5 minutes
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret in production
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find all SCHEDULED campaigns that are due (scheduledAt <= now)
    const dueCampaigns = await prisma.emailCampaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          lte: new Date(),
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5, // Process max 5 at a time to stay within function timeout
    });

    if (dueCampaigns.length === 0) {
      return NextResponse.json({
        message: 'No scheduled campaigns to process',
        processed: 0,
      });
    }

    const results: Array<{
      campaignId: string;
      name: string;
      success: boolean;
      sentCount?: number;
      failedCount?: number;
      error?: string;
    }> = [];

    // Process each campaign
    for (const campaign of dueCampaigns) {
      console.log(`Processing scheduled campaign: ${campaign.name} (${campaign.id})`);

      const result = await sendCampaign(campaign.id);

      results.push({
        campaignId: campaign.id,
        name: campaign.name,
        success: result.success,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        error: result.error,
      });

      console.log(`Campaign ${campaign.name}: sent=${result.sentCount}, failed=${result.failedCount}`);
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Processed ${results.length} campaigns (${successCount} succeeded, ${failCount} failed)`,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('Error processing scheduled campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to process scheduled campaigns' },
      { status: 500 }
    );
  }
}
