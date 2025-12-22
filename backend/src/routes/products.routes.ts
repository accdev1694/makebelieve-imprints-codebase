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

const getProductsSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    category: z.enum(['SUBLIMATION', 'STATIONERY', 'LARGE_FORMAT', 'PHOTO_PRINTS', 'DIGITAL', 'CUSTOM_ORDER']).optional(),
    productType: z.string().optional(),
    customizationType: z.enum(['TEMPLATE_BASED', 'UPLOAD_OWN', 'FULLY_CUSTOM', 'DIGITAL_DOWNLOAD']).optional(),
    status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'OUT_OF_STOCK']).optional(),
    featured: z.string().optional().transform((val) => val === 'true'),
    search: z.string().optional(),
    sortBy: z.enum(['name', 'price', 'createdAt', 'featured']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  }),
});

const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    slug: z.string().min(1).max(255),
    description: z.string().min(1),
    category: z.enum(['SUBLIMATION', 'STATIONERY', 'LARGE_FORMAT', 'PHOTO_PRINTS', 'DIGITAL', 'CUSTOM_ORDER']),
    productType: z.enum([
      'TSHIRT', 'MUG', 'WATER_BOTTLE', 'MOUSEMAT', 'KEYCHAIN', 'CUSHION_PILLOW',
      'BUSINESS_CARD', 'LEAFLET', 'GREETING_CARD', 'POSTCARD',
      'BANNER', 'POSTER',
      'CANVAS_PRINT', 'ALUMINUM_PRINT', 'PHOTO_PAPER_PRINT', 'ACRYLIC_LED_PRINT',
      'DIGITAL_PDF'
    ]),
    customizationType: z.enum(['TEMPLATE_BASED', 'UPLOAD_OWN', 'FULLY_CUSTOM', 'DIGITAL_DOWNLOAD']),
    basePrice: z.number().positive(),
    currency: z.string().default('GBP'),
    status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'OUT_OF_STOCK']).optional().default('DRAFT'),
    featured: z.boolean().optional().default(false),
    seoTitle: z.string().max(255).optional(),
    seoDescription: z.string().max(500).optional(),
    seoKeywords: z.string().max(500).optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    slug: z.string().min(1).max(255).optional(),
    description: z.string().min(1).optional(),
    category: z.enum(['SUBLIMATION', 'STATIONERY', 'LARGE_FORMAT', 'PHOTO_PRINTS', 'DIGITAL', 'CUSTOM_ORDER']).optional(),
    productType: z.enum([
      'TSHIRT', 'MUG', 'WATER_BOTTLE', 'MOUSEMAT', 'KEYCHAIN', 'CUSHION_PILLOW',
      'BUSINESS_CARD', 'LEAFLET', 'GREETING_CARD', 'POSTCARD',
      'BANNER', 'POSTER',
      'CANVAS_PRINT', 'ALUMINUM_PRINT', 'PHOTO_PAPER_PRINT', 'ACRYLIC_LED_PRINT',
      'DIGITAL_PDF'
    ]).optional(),
    customizationType: z.enum(['TEMPLATE_BASED', 'UPLOAD_OWN', 'FULLY_CUSTOM', 'DIGITAL_DOWNLOAD']).optional(),
    basePrice: z.number().positive().optional(),
    currency: z.string().optional(),
    status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'OUT_OF_STOCK']).optional(),
    featured: z.boolean().optional(),
    seoTitle: z.string().max(255).optional(),
    seoDescription: z.string().max(500).optional(),
    seoKeywords: z.string().max(500).optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/products
 * List all products with filtering, search, and pagination
 * Public route
 */
router.get(
  '/',
  validateRequest(getProductsSchema),
  async (req, res) => {
    const {
      page,
      limit,
      category,
      productType,
      customizationType,
      status,
      featured,
      search,
      sortBy,
      sortOrder,
    } = req.query as any;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (category) where.category = category;
    if (productType) where.productType = productType;
    if (customizationType) where.customizationType = customizationType;
    if (status) where.status = status;
    if (featured !== undefined) where.featured = featured;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { seoKeywords: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.product.count({ where });

    // Get products
    const products = await prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
        },
        variants: {
          where: { isDefault: true },
          take: 1,
        },
        _count: {
          select: {
            variants: true,
            templates: true,
          },
        },
      },
    });

    res.json({
      products,
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
 * GET /api/products/:id
 * Get a single product with all variants, images, and templates
 * Public route
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: {
        orderBy: { isDefault: 'desc' },
        include: {
          images: true,
        },
      },
      images: {
        orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
      },
      templates: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  res.json(product);
});

/**
 * POST /api/products
 * Create a new product
 * Admin only
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  validateRequest(createProductSchema),
  async (req, res) => {
    const productData = req.body;

    const product = await prisma.product.create({
      data: productData,
      include: {
        variants: true,
        images: true,
        templates: true,
      },
    });

    res.status(201).json(product);
  }
);

/**
 * PUT /api/products/:id
 * Update a product
 * Admin only
 */
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validateRequest(updateProductSchema),
  async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new NotFoundError('Product not found');
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        variants: true,
        images: true,
        templates: true,
      },
    });

    res.json(product);
  }
);

/**
 * DELETE /api/products/:id
 * Delete a product
 * Admin only
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;

  // Check if product exists
  const existingProduct = await prisma.product.findUnique({
    where: { id },
  });

  if (!existingProduct) {
    throw new NotFoundError('Product not found');
  }

  await prisma.product.delete({
    where: { id },
  });

  res.status(204).send();
});

export default router;
