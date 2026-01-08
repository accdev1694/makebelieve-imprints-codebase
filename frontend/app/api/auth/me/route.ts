import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, handleApiError, transformUserForFrontend } from '@/lib/server/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authUser = await requireAuth(request);

    // Get full user data from database
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        name: true,
        type: true,
        createdAt: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Transform user for frontend (type -> userType mapping)
    const user = transformUserForFrontend(dbUser);

    return NextResponse.json(
      {
        success: true,
        data: { user },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
