import { NextRequest, NextResponse } from 'next/server';
import { login, UserNotFoundError, InvalidPasswordError } from '@/lib/server/auth-service';
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
    // Handle distinct login errors
    if (error instanceof UserNotFoundError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          message: 'No account found with this email. Would you like to create one?',
        },
        { status: 401 }
      );
    }

    if (error instanceof InvalidPasswordError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          message: 'Incorrect password. Forgot your password?',
        },
        { status: 401 }
      );
    }

    return handleApiError(error);
  }
}
