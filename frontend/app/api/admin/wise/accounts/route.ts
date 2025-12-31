import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import {
  getWiseAccounts,
  connectWiseAccount,
  getProfiles,
  getBalances,
} from '@/lib/server/wise-service';

/**
 * GET /api/admin/wise/accounts
 * List connected Wise accounts
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const accounts = await getWiseAccounts();

    return NextResponse.json({
      success: true,
      data: { accounts },
    });
  } catch (error) {
    console.error('Get Wise accounts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/wise/accounts
 * Connect a new Wise account
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const body = await request.json();
    const { apiToken } = body;

    if (!apiToken) {
      return NextResponse.json(
        { error: 'API token is required' },
        { status: 400 }
      );
    }

    // Validate token by fetching profiles
    try {
      const profiles = await getProfiles(apiToken);
      if (profiles.length === 0) {
        return NextResponse.json(
          { error: 'Invalid API token or no profiles found' },
          { status: 400 }
        );
      }

      // Get balances to verify full access
      await getBalances(profiles[0].id, apiToken);
    } catch {
      return NextResponse.json(
        { error: 'Invalid API token - could not authenticate with Wise' },
        { status: 400 }
      );
    }

    // Connect the account
    const result = await connectWiseAccount(apiToken, user.userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { accountId: result.accountId },
    });
  } catch (error) {
    console.error('Connect Wise account error:', error);
    return NextResponse.json(
      { error: 'Failed to connect account' },
      { status: 500 }
    );
  }
}
