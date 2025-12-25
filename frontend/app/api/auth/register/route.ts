import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/lib/server/auth-service';
import { setAuthCookies, handleApiError } from '@/lib/server/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Basic validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Register user
    const result = await register({ email, password, name });

    // Create response with user data
    const response = NextResponse.json(
      {
        success: true,
        data: { user: result.user },
      },
      { status: 201 }
    );

    // Set auth cookies
    return setAuthCookies(response, result.tokens.accessToken, result.tokens.refreshToken);
  } catch (error) {
    if (error instanceof Error && error.message === 'Email already registered') {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }
    return handleApiError(error);
  }
}
