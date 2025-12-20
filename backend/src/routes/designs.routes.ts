import { Router, Request, Response } from 'express';
import { PrismaClient, PrintSize, Material, Orientation } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody, validateParams, commonSchemas } from '../utils/validation';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

/**
 * Validation schemas
 */
const createDesignSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  fileUrl: z.string().url('Invalid file URL'),
  printSize: z.nativeEnum(PrintSize).optional(),
  material: z.nativeEnum(Material).optional(),
  orientation: z.nativeEnum(Orientation).optional(),
  printWidth: z.number().int().positive().optional(),
  printHeight: z.number().int().positive().optional(),
  previewUrl: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
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
    const design = await prisma.design.create({
      data: {
        ...req.body,
        userId: req.user!.userId,
      },
    });

    res.status(201).json({
      success: true,
      data: { design },
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

    const where =
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
        designs,
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
      data: { design },
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

    const design = await prisma.design.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json({
      success: true,
      data: { design },
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
