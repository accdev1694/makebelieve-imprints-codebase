import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { validateRequest } from '../utils/validation';
import { NotFoundError } from '../utils/errors';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// VALIDATION SCHEMAS
// ============================================

const getTemplatesSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    category: z.string().optional(),
    productId: z.string().optional(),
    isPremium: z.string().optional().transform((val) => val === 'true'),
    search: z.string().optional(),
    sortBy: z.enum(['name', 'price', 'createdAt', 'category']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

const createTemplateSchema = z.object({
  body: z.object({
    productId: z.string().min(1),
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    thumbnailUrl: z.string().url(),
    designFileUrl: z.string().url(),
    category: z.string().max(100).optional(),
    tags: z.string().optional(), // JSON string array
    isPremium: z.boolean().default(false),
    price: z.number().min(0).default(0),
    metadata: z.record(z.any()).optional(),
  }),
});

const updateTemplateSchema = z.object({
  body: z.object({
    productId: z.string().min(1).optional(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    thumbnailUrl: z.string().url().optional(),
    designFileUrl: z.string().url().optional(),
    category: z.string().max(100).optional(),
    tags: z.string().optional(), // JSON string array
    isPremium: z.boolean().optional(),
    price: z.number().min(0).optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/products/:productId/templates
 * List all templates for a specific product
 * Public route
 */
router.get('/products/:productId/templates', async (req, res) => {
  const { productId } = req.params;

  // Verify product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  const templates = await prisma.productTemplate.findMany({
    where: {
      productId,
    },
    orderBy: [{ isPremium: 'asc' }, { createdAt: 'desc' }],
  });

  res.json(templates);
});

/**
 * GET /api/templates
 * Browse all templates with filtering, search, and pagination
 * Public route
 */
router.get(
  '/templates',
  validateRequest(getTemplatesSchema),
  async (req, res) => {
    const {
      page,
      limit,
      category,
      productId,
      isPremium,
      search,
      sortBy,
      sortOrder,
    } = req.query as any;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (category) where.category = category;
    if (productId) where.productId = productId;
    if (isPremium !== undefined) where.isPremium = isPremium;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.productTemplate.count({ where });

    // Get templates
    const templates = await prisma.productTemplate.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
          },
        },
      },
    });

    res.json({
      templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
);

/**
 * POST /api/templates
 * Create a new template
 * Admin only
 */
router.post(
  '/templates',
  authenticate,
  requireAdmin,
  validateRequest(createTemplateSchema),
  async (req, res) => {
    const templateData = req.body;

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: templateData.productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const template = await prisma.productTemplate.create({
      data: templateData,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    res.status(201).json(template);
  }
);

/**
 * PUT /api/templates/:id
 * Update a template
 * Admin only
 */
router.put(
  '/templates/:id',
  authenticate,
  requireAdmin,
  validateRequest(updateTemplateSchema),
  async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    // Check if template exists
    const existingTemplate = await prisma.productTemplate.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      throw new NotFoundError('Template not found');
    }

    // If updating productId, verify new product exists
    if (updateData.productId) {
      const product = await prisma.product.findUnique({
        where: { id: updateData.productId },
      });

      if (!product) {
        throw new NotFoundError('Product not found');
      }
    }

    const template = await prisma.productTemplate.update({
      where: { id },
      data: updateData,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    res.json(template);
  }
);

/**
 * DELETE /api/templates/:id
 * Delete a template
 * Admin only
 */
router.delete('/templates/:id', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;

  // Check if template exists
  const existingTemplate = await prisma.productTemplate.findUnique({
    where: { id },
  });

  if (!existingTemplate) {
    throw new NotFoundError('Template not found');
  }

  await prisma.productTemplate.delete({
    where: { id },
  });

  res.status(204).send();
});

export default router;
