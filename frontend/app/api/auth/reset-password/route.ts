import { NextRequest, NextResponse } from 'next/server';
import { resetPassword } from '@/lib/server/auth-service';
import { handleApiError } from '@/lib/server/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    // Basic validation
    if (!token) {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Reset password
    const result = await resetPassword(token, password);

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid or expired reset token') {
      return NextResponse.json(
        {
          error: error.message,
          message: 'This password reset link is invalid or has expired. Please request a new one.',
        },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
