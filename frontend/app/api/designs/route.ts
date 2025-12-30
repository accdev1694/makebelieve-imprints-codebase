import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, handleApiError } from '@/lib/server/auth';
import { Prisma, Design } from '@prisma/client';

// Type for Design from Prisma with relations (used in GET)
type DesignWithRelations = Prisma.DesignGetPayload<{
  include: {
    user: { select: { id: true; name: true; email: true } };
    _count: { select: { orders: true } };
  };
}>;

/**
 * Helper to map Prisma Design to frontend format
 * Works with both full relations (from GET) and basic design (from POST)
 */
function mapDesignToFrontend(design: DesignWithRelations): ReturnType<typeof mapDesignBasic> & { user: DesignWithRelations['user']; _count: DesignWithRelations['_count'] };
function mapDesignToFrontend(design: Design): ReturnType<typeof mapDesignBasic>;
function mapDesignToFrontend(design: Design | DesignWithRelations | null) {
  if (!design) return null;
  return mapDesignBasic(design);
}

function mapDesignBasic(design: Design | DesignWithRelations) {
  const { title, fileUrl, printWidth, printHeight, ...rest } = design;
  return {
    ...rest,
    name: title,
    imageUrl: fileUrl,
    customWidth: printWidth,
    customHeight: printHeight,
  };
}

/**
 * GET /api/designs
 * List designs (user's own or all for admin)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.DesignWhereInput =
      user.type === 'admin' ? {} : { userId: user.userId };

    const [designs, total] = await Promise.all([
      prisma.design.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              orders: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.design.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        designs: designs.map(mapDesignToFrontend),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/designs
 * Create a new design
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const { name, imageUrl, customWidth, customHeight, ...rest } = body;

    const design = await prisma.design.create({
      data: {
        ...rest,
        title: name,
        fileUrl: imageUrl,
        printWidth: customWidth,
        printHeight: customHeight,
        userId: user.userId,
      },
    });

    return NextResponse.json(
      { success: true, data: { design: mapDesignToFrontend(design) } },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
