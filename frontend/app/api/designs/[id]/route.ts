import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { Prisma } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const mapDesignToFrontend = (design: any) => {
  if (!design) return null;
  const { title, fileUrl, printWidth, printHeight, ...rest } = design;
  return {
    ...rest,
    name: title,
    imageUrl: fileUrl,
    customWidth: printWidth,
    customHeight: printHeight,
  };
};

/**
 * GET /api/designs/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const design = await prisma.design.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        orders: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!design) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    }

    if (design.userId !== user.userId && user.type !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: { design: mapDesignToFrontend(design) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/designs/[id]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.design.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    }

    if (existing.userId !== user.userId && user.type !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { name, imageUrl, customWidth, customHeight, ...rest } = body;

    const dataToUpdate: Prisma.DesignUpdateInput = { ...rest };
    if (name) dataToUpdate.title = name;
    if (imageUrl) dataToUpdate.fileUrl = imageUrl;
    if (customWidth) dataToUpdate.printWidth = customWidth;
    if (customHeight) dataToUpdate.printHeight = customHeight;

    const design = await prisma.design.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      data: { design: mapDesignToFrontend(design) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/designs/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const existing = await prisma.design.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 });
    }

    if (existing.userId !== user.userId && user.type !== 'admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await prisma.design.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Design deleted successfully',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
