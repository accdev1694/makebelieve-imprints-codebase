import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/server/auth-service';
import { setAuthCookies, handleApiError, transformUserForFrontend } from '@/lib/server/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Basic validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Login user
    const result = await login({ email, password });

    // Transform user for frontend (type -> userType mapping)
    const user = transformUserForFrontend(result.user);

    // Create response with user data
    const response = NextResponse.json(
      {
        success: true,
        data: { user },
      },
      { status: 200 }
    );

    // Set auth cookies
    return setAuthCookies(response, result.tokens.accessToken, result.tokens.refreshToken);
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid email or password') {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    return handleApiError(error);
  }
}
