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
    // Dynamic category filtering (new)
    categoryId: z.string().uuid().optional(),
    categorySlug: z.string().optional(),
    subcategoryId: z.string().uuid().optional(),
    subcategorySlug: z.string().optional(),
    // Legacy enum filtering (kept for backward compatibility)
    category: z.enum(['HOME_LIFESTYLE', 'STATIONERY', 'LARGE_FORMAT', 'PHOTO_PRINTS', 'DIGITAL', 'CUSTOM_ORDER']).optional(),
    productType: z.string().optional(),
    customizationType: z.enum(['TEMPLATE_BASED', 'UPLOAD_OWN', 'FULLY_CUSTOM', 'DIGITAL_DOWNLOAD']).optional(),
    status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED', 'OUT_OF_STOCK']).optional(),
    featured: z.string().optional().transform((val) => val === 'true'),
    search: z.string().optional(),
    sortBy: z.enum(['name', 'price', 'createdAt', 'featured']).optional().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    // New filters for materials, sizes, and price range
    materials: z.string().optional(), // Comma-separated list of materials
    sizes: z.string().optional(), // Comma-separated list of sizes
    minPrice: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
    maxPrice: z.string().optional().transform((val) => (val ? parseFloat(val) : undefined)),
  }),
});

const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    slug: z.string().min(1).max(255),
    description: z.string().min(1),
    // Dynamic category references (new)
    categoryId: z.string().uuid(),
    subcategoryId: z.string().uuid().optional(),
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
    // Dynamic category references (new)
    categoryId: z.string().uuid().optional(),
    subcategoryId: z.string().uuid().nullable().optional(),
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
      categoryId,
      categorySlug,
      subcategoryId,
      subcategorySlug,
      category, // Legacy enum filter
      productType, // Legacy enum filter
      customizationType,
      status,
      featured,
      search,
      sortBy,
      sortOrder,
      materials,
      sizes,
      minPrice,
      maxPrice,
    } = req.query as any;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Dynamic category filtering (new approach)
    if (categoryId) {
      where.categoryId = categoryId;
    } else if (categorySlug) {
      // Look up category by slug
      const cat = await prisma.category.findUnique({ where: { slug: categorySlug } });
      if (cat) where.categoryId = cat.id;
    }

    // Dynamic subcategory filtering
    if (subcategoryId) {
      where.subcategoryId = subcategoryId;
    } else if (subcategorySlug) {
      const subcat = await prisma.subcategory.findUnique({ where: { slug: subcategorySlug } });
      if (subcat) where.subcategoryId = subcat.id;
    }

    // Legacy enum filtering (for backward compatibility)
    if (category) where.legacyCategory = category;
    if (productType) where.legacyProductType = productType;

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

    // Material filter - products that have variants with specified materials
    if (materials) {
      const materialList = materials.split(',').map((m: string) => m.trim());
      where.variants = {
        some: {
          material: { in: materialList },
        },
      };
    }

    // Size filter - products that have variants with specified sizes
    if (sizes) {
      const sizeList = sizes.split(',').map((s: string) => s.trim());
      if (where.variants) {
        // Combine with existing material filter
        where.variants.some = {
          ...where.variants.some,
          size: { in: sizeList },
        };
      } else {
        where.variants = {
          some: {
            size: { in: sizeList },
          },
        };
      }
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.basePrice = {};
      if (minPrice !== undefined) {
        where.basePrice.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.basePrice.lte = maxPrice;
      }
    }

    // Get total count
    const total = await prisma.product.count({ where });

    // Map sortBy to actual database fields
    const sortFieldMap: Record<string, string> = {
      name: 'name',
      price: 'basePrice',
      createdAt: 'createdAt',
      featured: 'featured',
    };
    const actualSortField = sortFieldMap[sortBy] || 'createdAt';

    // Get products with category and subcategory data
    const products = await prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [actualSortField]: sortOrder },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        subcategory: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
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
 * GET /api/products/filters
 * Get available filter options (materials, sizes, price range)
 * Returns distinct values for filter UI with counts
 * Public route
 */
router.get('/filters', async (req, res) => {
  const { category, productType } = req.query;

  // Build base where clause for optional filtering by category
  const productWhere: any = { status: 'ACTIVE' };
  if (category) productWhere.legacyCategory = category;
  if (productType) productWhere.legacyProductType = productType;

  // Get product IDs matching the filter
  const matchingProducts = await prisma.product.findMany({
    where: productWhere,
    select: { id: true, basePrice: true },
  });

  const productIds = matchingProducts.map((p) => p.id);

  // Get distinct materials with counts
  const materialsRaw = await prisma.productVariant.groupBy({
    by: ['material'],
    where: {
      productId: { in: productIds },
      material: { not: null },
    },
    _count: { material: true },
    orderBy: { _count: { material: 'desc' } },
  });

  const materials = materialsRaw
    .filter((m) => m.material)
    .map((m) => ({
      value: m.material!,
      count: m._count.material,
    }));

  // Get distinct sizes with counts
  const sizesRaw = await prisma.productVariant.groupBy({
    by: ['size'],
    where: {
      productId: { in: productIds },
      size: { not: null },
    },
    _count: { size: true },
    orderBy: { _count: { size: 'desc' } },
  });

  const sizes = sizesRaw
    .filter((s) => s.size)
    .map((s) => ({
      value: s.size!,
      count: s._count.size,
    }));

  // Calculate price range from matching products
  const prices = matchingProducts.map((p) => Number(p.basePrice));
  const priceRange = {
    min: prices.length > 0 ? Math.min(...prices) : 0,
    max: prices.length > 0 ? Math.max(...prices) : 0,
  };

  res.json({
    materials,
    sizes,
    priceRange,
  });
});

/**
 * GET /api/products/:id
 * Get a single product with all variants, images, and templates
 * Public route
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  // Support lookup by ID or slug
  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { id: id.length === 36 ? id : undefined },
        { slug: id },
      ].filter(c => Object.values(c).some(v => v !== undefined)),
    },
    include: {
      category: true,
      subcategory: true,
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
