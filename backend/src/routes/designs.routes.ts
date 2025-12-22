import { Router, Request, Response } from 'express';
import { Prisma, PrismaClient, PrintSize, Material, Orientation } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody, validateParams, commonSchemas } from '../utils/validation';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

/**
 * Helper to map Prisma Design to the format frontend expects
 */
const mapDesignToFrontend = (design: any) => {
  if (!design) return null;

  const { title, fileUrl, printWidth, printHeight, ...rest } = design;

  // Make sure user object is not accidentally leaked if it's not selected
  if (rest.user && !rest.user.id) {
    delete rest.user;
  }
  
  return {
    ...rest,
    name: title,
    description: rest.description || '', // Ensure description is always a string
    imageUrl: fileUrl,
    customWidth: printWidth,
    customHeight: printHeight,
  };
};

/**
 * Validation schemas
 */
const createDesignSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().min(1).refine(
    (val) => val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/'),
    { message: 'Invalid image URL - must be a full URL or relative path' }
  ),
  printSize: z.nativeEnum(PrintSize),
  material: z.nativeEnum(Material),
  orientation: z.nativeEnum(Orientation),
  customWidth: z.number().int().positive().optional(),
  customHeight: z.number().int().positive().optional(),
  thumbnailUrl: z.string().min(1).refine(
    (val) => val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/'),
    { message: 'Invalid thumbnail URL - must be a full URL or relative path' }
  ).optional(),
});

const updateDesignSchema = createDesignSchema.partial();

/**
 * POST /api/designs
 * Create a new design
 */
router.post(
  '/',
  authenticate,
  validateBody(createDesignSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, imageUrl, description, customWidth, customHeight, ...rest } = req.body;

    const design = await prisma.design.create({
      data: {
        ...rest,
        title: name,
        fileUrl: imageUrl,
        printWidth: customWidth,
        printHeight: customHeight,
        userId: req.user!.userId,
      },
    });

    res.status(201).json({
      success: true,
      data: { design: mapDesignToFrontend(design) },
    });
  })
);

/**
 * GET /api/designs
 * List designs (user's own designs or all for admin)
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.DesignWhereInput =
      req.user!.type === 'admin'
        ? {} // Admin sees all designs
        : { userId: req.user!.userId }; // Users see only their designs

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

    res.json({
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
  })
);

/**
 * GET /api/designs/:id
 * Get design by ID
 */
router.get(
  '/:id',
  authenticate,
  validateParams(commonSchemas.uuidParam),
  asyncHandler(async (req: Request, res: Response) => {
    const design = await prisma.design.findUnique({
      where: { id: req.params.id },
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
      throw new NotFoundError('Design not found');
    }

    // Only owner or admin can view design
    if (design.userId !== req.user!.userId && req.user!.type !== 'admin') {
      throw new ForbiddenError('Access denied');
    }

    res.json({
      success: true,
      data: { design: mapDesignToFrontend(design) },
    });
  })
);

/**
 * PUT /api/designs/:id
 * Update design
 */
router.put(
  '/:id',
  authenticate,
  validateParams(commonSchemas.uuidParam),
  validateBody(updateDesignSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // Check ownership
    const existing = await prisma.design.findUnique({
      where: { id: req.params.id },
      select: { userId: true },
    });

    if (!existing) {
      throw new NotFoundError('Design not found');
    }

    if (existing.userId !== req.user!.userId && req.user!.type !== 'admin') {
      throw new ForbiddenError('Access denied');
    }

    const { name, imageUrl, description, customWidth, customHeight, ...rest } = req.body;

    const dataToUpdate: Prisma.DesignUpdateInput = { ...rest };
    if (name) dataToUpdate.title = name;
    if (imageUrl) dataToUpdate.fileUrl = imageUrl;
    if (customWidth) dataToUpdate.printWidth = customWidth;
    if (customHeight) dataToUpdate.printHeight = customHeight;
    // Description is not in the db model, so we don't add it.

    const design = await prisma.design.update({
      where: { id: req.params.id },
      data: dataToUpdate,
    });

    res.json({
      success: true,
      data: { design: mapDesignToFrontend(design) },
    });
  })
);

/**
 * DELETE /api/designs/:id
 * Delete design
 */
router.delete(
  '/:id',
  authenticate,
  validateParams(commonSchemas.uuidParam),
  asyncHandler(async (req: Request, res: Response) => {
    // Check ownership
    const existing = await prisma.design.findUnique({
      where: { id: req.params.id },
      select: { userId: true },
    });

    if (!existing) {
      throw new NotFoundError('Design not found');
    }

    if (existing.userId !== req.user!.userId && req.user!.type !== 'admin') {
      throw new ForbiddenError('Access denied');
    }

    await prisma.design.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Design deleted successfully',
    });
  })
);

export default router;

