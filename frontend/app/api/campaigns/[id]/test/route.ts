import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/lib/server/auth';
import { sendTestCampaign } from '@/lib/server/campaign-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/campaigns/[id]/test - Send test email (admin only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const { id } = await params;

    const body = await request.json();
    const testEmail = body.email || user.email;

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Test email address required' },
        { status: 400 }
      );
    }

    console.log('Sending test campaign:', id, 'to:', testEmail);
    const success = await sendTestCampaign(id, testEmail);

    if (!success) {
      console.error('sendTestCampaign returned false');
      return NextResponse.json(
        { error: 'Failed to send test email. Check server logs for details.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${testEmail}`,
    });
  } catch (error) {
    console.error('Test campaign error:', error);
    return handleApiError(error);
  }
}
