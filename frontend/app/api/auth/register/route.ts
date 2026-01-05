import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/lib/server/auth-service';
import { setAuthCookies, handleApiError, transformUserForFrontend } from '@/lib/server/auth';
import { validatePassword, validateEmail, sanitizeName } from '@/lib/server/validation';

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

    // Email format validation
    const trimmedEmail = email.trim().toLowerCase();
    const emailValidation = validateEmail(trimmedEmail);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { error: emailValidation.errors[0] },
        { status: 400 }
      );
    }

    // Password complexity validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.errors.join('. ') },
        { status: 400 }
      );
    }

    // Sanitize name
    const sanitizedName = sanitizeName(name);
    if (sanitizedName.length < 1) {
      return NextResponse.json(
        { error: 'Please enter a valid name' },
        { status: 400 }
      );
    }

    // Register user with sanitized values
    const result = await register({
      email: trimmedEmail,
      password,
      name: sanitizedName,
    });

    // Transform user for frontend (type -> userType mapping)
    const user = transformUserForFrontend(result.user);

    // Create response with user data
    const response = NextResponse.json(
      {
        success: true,
        data: { user },
      },
      { status: 201 }
    );

    // Set auth cookies
    return setAuthCookies(response, result.tokens.accessToken, result.tokens.refreshToken);
  } catch (error) {
    if (error instanceof Error && error.message === 'Email already registered') {
      // Use a generic message to prevent email enumeration
      // Attackers shouldn't be able to determine if an email is already registered
      return NextResponse.json(
        { error: 'Unable to create account. Please try again or contact support.' },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
