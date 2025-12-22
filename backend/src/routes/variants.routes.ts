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

const createVariantSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    sku: z.string().min(1).max(100),
    size: z.string().max(50).optional(),
    color: z.string().max(50).optional(),
    material: z.string().max(100).optional(),
    finish: z.string().max(50).optional(),
    orientation: z.string().max(50).optional(),
    dimensions: z.string().max(100).optional(),
    price: z.number().default(0),
    compareAtPrice: z.number().optional(),
    stock: z.number().int().min(0).default(0),
    lowStockThreshold: z.number().int().min(0).optional(),
    isDefault: z.boolean().default(false),
    isActive: z.boolean().default(true),
    weight: z.number().optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

const updateVariantSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    sku: z.string().min(1).max(100).optional(),
    size: z.string().max(50).optional(),
    color: z.string().max(50).optional(),
    material: z.string().max(100).optional(),
    finish: z.string().max(50).optional(),
    orientation: z.string().max(50).optional(),
    dimensions: z.string().max(100).optional(),
    price: z.number().optional(),
    compareAtPrice: z.number().optional(),
    stock: z.number().int().min(0).optional(),
    lowStockThreshold: z.number().int().min(0).optional(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
    weight: z.number().optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/products/:productId/variants
 * List all variants for a specific product
 * Public route
 */
router.get('/products/:productId/variants', async (req, res) => {
  const { productId } = req.params;

  // Verify product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  const variants = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    include: {
      images: {
        orderBy: { displayOrder: 'asc' },
      },
    },
  });

  res.json(variants);
});

/**
 * POST /api/products/:productId/variants
 * Create a new variant for a product
 * Admin only
 */
router.post(
  '/products/:productId/variants',
  authenticate,
  requireAdmin,
  validateRequest(createVariantSchema),
  async (req, res) => {
    const { productId } = req.params;
    const variantData = req.body;

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // If this variant is set as default, unset other defaults
    if (variantData.isDefault) {
      await prisma.productVariant.updateMany({
        where: { productId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const variant = await prisma.productVariant.create({
      data: {
        ...variantData,
        productId,
      },
      include: {
        images: true,
      },
    });

    res.status(201).json(variant);
  }
);

/**
 * PUT /api/variants/:id
 * Update a variant
 * Admin only
 */
router.put(
  '/variants/:id',
  authenticate,
  requireAdmin,
  validateRequest(updateVariantSchema),
  async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    // Check if variant exists
    const existingVariant = await prisma.productVariant.findUnique({
      where: { id },
    });

    if (!existingVariant) {
      throw new NotFoundError('Variant not found');
    }

    // If setting this variant as default, unset other defaults for the same product
    if (updateData.isDefault === true) {
      await prisma.productVariant.updateMany({
        where: {
          productId: existingVariant.productId,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    const variant = await prisma.productVariant.update({
      where: { id },
      data: updateData,
      include: {
        images: true,
      },
    });

    res.json(variant);
  }
);

/**
 * DELETE /api/variants/:id
 * Delete a variant
 * Admin only
 */
router.delete('/variants/:id', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;

  // Check if variant exists
  const existingVariant = await prisma.productVariant.findUnique({
    where: { id },
  });

  if (!existingVariant) {
    throw new NotFoundError('Variant not found');
  }

  await prisma.productVariant.delete({
    where: { id },
  });

  res.status(204).send();
});

export default router;
