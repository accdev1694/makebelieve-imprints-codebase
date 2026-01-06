import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { refreshAccessToken } from '@/lib/server/auth-service';
import { setAuthCookies, handleApiError } from '@/lib/server/auth';

export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 401 }
      );
    }

    // Refresh tokens
    const tokens = await refreshAccessToken(refreshToken);

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: 'Tokens refreshed successfully',
      },
      { status: 200 }
    );

    // Set new auth cookies
    return setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
  } catch (error) {
    if (error instanceof Error && error.message.includes('token')) {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }
    return handleApiError(error);
  }
}
