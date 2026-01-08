import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/users/[id]
 * Get user details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireAuth(request);
    const { id } = await params;

    // Users can only view their own profile, admins can view any
    if (id !== authUser.userId && authUser.type !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        type: true,
        profile: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/users/[id]
 * Update user profile
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();

    // Users can only update their own profile
    if (id !== authUser.userId && authUser.type !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { name, profile } = body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(profile && { profile }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        type: true,
        profile: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
