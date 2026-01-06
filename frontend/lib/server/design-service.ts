import prisma from '@/lib/prisma';
import { Prisma, Design } from '@prisma/client';

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==================== Design Types ====================

type DesignWithRelations = Prisma.DesignGetPayload<{
  include: {
    user: { select: { id: true; name: true; email: true } };
    _count: { select: { orders: true } };
  };
}>;

type DesignWithOrders = Prisma.DesignGetPayload<{
  include: {
    user: { select: { id: true; name: true } };
    orders: { select: { id: true; status: true; createdAt: true } };
  };
}>;

export interface ListDesignsParams {
  page?: number;
  limit?: number;
}

export interface CreateDesignData {
  name?: string;
  imageUrl?: string;
  customWidth?: number;
  customHeight?: number;
  [key: string]: unknown;
}

// ==================== Helpers ====================

/**
 * Map Prisma design fields to frontend format
 * (title -> name, fileUrl -> imageUrl, printWidth -> customWidth, printHeight -> customHeight)
 */
function mapDesignToFrontend(design: Design | DesignWithRelations | DesignWithOrders | null) {
  if (!design) return null;
  const { title, fileUrl, printWidth, printHeight, ...rest } = design as Design & {
    title?: string | null;
    fileUrl?: string | null;
    printWidth?: number | null;
    printHeight?: number | null;
  };
  return {
    ...rest,
    name: title,
    imageUrl: fileUrl,
    customWidth: printWidth,
    customHeight: printHeight,
  };
}

// ==================== Design Operations ====================

/**
 * List designs (user's own or all for admin)
 */
export async function listDesigns(
  userId: string,
  isAdmin: boolean,
  params: ListDesignsParams = {}
): Promise<ServiceResult<unknown>> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.DesignWhereInput = isAdmin ? {} : { userId };

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

  return {
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
  };
}

/**
 * Get a single design by ID
 */
export async function getDesign(
  id: string,
  userId: string,
  isAdmin: boolean
): Promise<ServiceResult<unknown>> {
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
    return { success: false, error: 'Design not found' };
  }

  if (design.userId !== userId && !isAdmin) {
    return { success: false, error: 'Access denied' };
  }

  return { success: true, data: { design: mapDesignToFrontend(design) } };
}

/**
 * Create a new design
 */
export async function createDesign(
  userId: string,
  data: CreateDesignData
): Promise<ServiceResult<unknown>> {
  const { name, imageUrl, customWidth, customHeight, ...rest } = data;

  const design = await prisma.design.create({
    data: {
      ...rest,
      title: name as string | undefined,
      fileUrl: imageUrl || '',
      printWidth: customWidth,
      printHeight: customHeight,
      user: { connect: { id: userId } },
    },
  });

  return { success: true, data: { design: mapDesignToFrontend(design) } };
}

/**
 * Update a design
 */
export async function updateDesign(
  id: string,
  userId: string,
  isAdmin: boolean,
  data: CreateDesignData
): Promise<ServiceResult<unknown>> {
  const existing = await prisma.design.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!existing) {
    return { success: false, error: 'Design not found' };
  }

  if (existing.userId !== userId && !isAdmin) {
    return { success: false, error: 'Access denied' };
  }

  const { name, imageUrl, customWidth, customHeight, ...rest } = data;

  const dataToUpdate: Prisma.DesignUpdateInput = { ...rest };
  if (name) dataToUpdate.title = name as string;
  if (imageUrl) dataToUpdate.fileUrl = imageUrl as string;
  if (customWidth) dataToUpdate.printWidth = customWidth;
  if (customHeight) dataToUpdate.printHeight = customHeight;

  const design = await prisma.design.update({
    where: { id },
    data: dataToUpdate,
  });

  return { success: true, data: { design: mapDesignToFrontend(design) } };
}

/**
 * Delete a design
 */
export async function deleteDesign(
  id: string,
  userId: string,
  isAdmin: boolean
): Promise<ServiceResult<null>> {
  const existing = await prisma.design.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!existing) {
    return { success: false, error: 'Design not found' };
  }

  if (existing.userId !== userId && !isAdmin) {
    return { success: false, error: 'Access denied' };
  }

  await prisma.design.delete({ where: { id } });

  return { success: true, data: null };
}
