import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logout } from '@/lib/server/auth-service';
import { clearAuthCookies, handleApiError } from '@/lib/server/auth';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    // Invalidate refresh token in database if exists
    if (refreshToken) {
      await logout(refreshToken);
    }

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      { status: 200 }
    );

    // Clear auth cookies
    return clearAuthCookies(response);
  } catch (error) {
    return handleApiError(error);
  }
}
