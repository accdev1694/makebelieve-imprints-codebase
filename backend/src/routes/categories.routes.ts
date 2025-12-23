import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody, validateParams, commonSchemas } from '../utils/validation';
import { NotFoundError, ValidationError } from '../utils/errors';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

/**
 * Validation schemas
 */
const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().optional(),
  image: z.string().url().optional().nullable(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

const createSubcategorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().optional(),
  image: z.string().url().optional().nullable(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const updateSubcategorySchema = createSubcategorySchema.partial();

/**
 * GET /api/categories
 * List all categories (public)
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const includeInactive = req.query.includeInactive === 'true';
    const includeSubcategories = req.query.includeSubcategories !== 'false';

    const where = includeInactive ? {} : { isActive: true };

    const categories = await prisma.category.findMany({
      where,
      include: includeSubcategories
        ? {
            subcategories: {
              where: includeInactive ? {} : { isActive: true },
              orderBy: { displayOrder: 'asc' },
            },
            _count: {
              select: { products: true },
            },
          }
        : {
            _count: {
              select: { products: true },
            },
          },
      orderBy: { displayOrder: 'asc' },
    });

    res.json({
      success: true,
      data: { categories },
    });
  })
);

/**
 * GET /api/categories/:id
 * Get single category (public)
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Support lookup by ID or slug
    const category = await prisma.category.findFirst({
      where: {
        OR: [
          { id: id.length === 36 ? id : undefined },
          { slug: id },
        ].filter(c => Object.values(c).some(v => v !== undefined)),
      },
      include: {
        subcategories: {
          where: { isActive: true },
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    res.json({
      success: true,
      data: { category },
    });
  })
);

/**
 * POST /api/categories
 * Create a new category (admin only)
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  validateBody(createCategorySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, slug, description, image, displayOrder, isActive } = req.body;

    // Check for duplicate slug
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw new ValidationError('A category with this slug already exists');
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description,
        image,
        displayOrder: displayOrder ?? 0,
        isActive: isActive ?? true,
      },
      include: {
        subcategories: true,
        _count: {
          select: { products: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: { category },
    });
  })
);

/**
 * PUT /api/categories/:id
 * Update a category (admin only)
 */
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validateParams(commonSchemas.uuidParam),
  validateBody(updateCategorySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if category exists
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Category not found');
    }

    // Check for duplicate slug if changing
    if (req.body.slug && req.body.slug !== existing.slug) {
      const duplicateSlug = await prisma.category.findUnique({
        where: { slug: req.body.slug },
      });
      if (duplicateSlug) {
        throw new ValidationError('A category with this slug already exists');
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: req.body,
      include: {
        subcategories: true,
        _count: {
          select: { products: true },
        },
      },
    });

    res.json({
      success: true,
      data: { category },
    });
  })
);

/**
 * DELETE /api/categories/:id
 * Delete a category (admin only)
 */
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validateParams(commonSchemas.uuidParam),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if category exists
    const existing = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true, subcategories: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Category not found');
    }

    // Check if category has products
    if (existing._count.products > 0) {
      throw new ValidationError(
        `Cannot delete category with ${existing._count.products} products. Move or delete products first.`
      );
    }

    await prisma.category.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  })
);

// ============================================
// SUBCATEGORY ROUTES
// ============================================

/**
 * GET /api/categories/:categoryId/subcategories
 * List subcategories for a category
 */
router.get(
  '/:categoryId/subcategories',
  asyncHandler(async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    const includeInactive = req.query.includeInactive === 'true';

    // Find category by ID or slug
    const category = await prisma.category.findFirst({
      where: {
        OR: [
          { id: categoryId.length === 36 ? categoryId : undefined },
          { slug: categoryId },
        ].filter(c => Object.values(c).some(v => v !== undefined)),
      },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const subcategories = await prisma.subcategory.findMany({
      where: {
        categoryId: category.id,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { displayOrder: 'asc' },
    });

    res.json({
      success: true,
      data: { subcategories },
    });
  })
);

/**
 * POST /api/categories/:categoryId/subcategories
 * Create a subcategory (admin only)
 */
router.post(
  '/:categoryId/subcategories',
  authenticate,
  requireAdmin,
  validateParams(z.object({ categoryId: z.string().uuid() })),
  validateBody(createSubcategorySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    const { name, slug, description, image, displayOrder, isActive } = req.body;

    // Check category exists
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Check for duplicate slug
    const existing = await prisma.subcategory.findUnique({ where: { slug } });
    if (existing) {
      throw new ValidationError('A subcategory with this slug already exists');
    }

    const subcategory = await prisma.subcategory.create({
      data: {
        categoryId,
        name,
        slug,
        description,
        image,
        displayOrder: displayOrder ?? 0,
        isActive: isActive ?? true,
      },
      include: {
        category: true,
        _count: {
          select: { products: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: { subcategory },
    });
  })
);

/**
 * GET /api/categories/subcategories/:id
 * Get a single subcategory
 */
router.get(
  '/subcategories/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const subcategory = await prisma.subcategory.findFirst({
      where: {
        OR: [
          { id: id.length === 36 ? id : undefined },
          { slug: id },
        ].filter(c => Object.values(c).some(v => v !== undefined)),
      },
      include: {
        category: true,
        _count: {
          select: { products: true },
        },
      },
    });

    if (!subcategory) {
      throw new NotFoundError('Subcategory not found');
    }

    res.json({
      success: true,
      data: { subcategory },
    });
  })
);

/**
 * PUT /api/categories/subcategories/:id
 * Update a subcategory (admin only)
 */
router.put(
  '/subcategories/:id',
  authenticate,
  requireAdmin,
  validateParams(commonSchemas.uuidParam),
  validateBody(updateSubcategorySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const existing = await prisma.subcategory.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Subcategory not found');
    }

    // Check for duplicate slug if changing
    if (req.body.slug && req.body.slug !== existing.slug) {
      const duplicateSlug = await prisma.subcategory.findUnique({
        where: { slug: req.body.slug },
      });
      if (duplicateSlug) {
        throw new ValidationError('A subcategory with this slug already exists');
      }
    }

    const subcategory = await prisma.subcategory.update({
      where: { id },
      data: req.body,
      include: {
        category: true,
        _count: {
          select: { products: true },
        },
      },
    });

    res.json({
      success: true,
      data: { subcategory },
    });
  })
);

/**
 * DELETE /api/categories/subcategories/:id
 * Delete a subcategory (admin only)
 */
router.delete(
  '/subcategories/:id',
  authenticate,
  requireAdmin,
  validateParams(commonSchemas.uuidParam),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const existing = await prisma.subcategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Subcategory not found');
    }

    if (existing._count.products > 0) {
      throw new ValidationError(
        `Cannot delete subcategory with ${existing._count.products} products. Move or delete products first.`
      );
    }

    await prisma.subcategory.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Subcategory deleted successfully',
    });
  })
);

export default router;
