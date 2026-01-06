/**
 * Product Service
 * Handles all product, variant, and image business logic
 */

import prisma from '@/lib/prisma';
import { Prisma, ProductCategory, ProductStatus, CustomizationType, ProductType } from '@prisma/client';

// ============================================
// Types
// ============================================

export interface ProductListParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  categorySlug?: string;
  category?: string; // Legacy enum
  subcategoryId?: string;
  subcategorySlug?: string;
  customizationType?: string;
  status?: string;
  featured?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateProductData {
  name: string;
  slug: string;
  description?: string;
  legacyCategory?: string;
  legacyProductType?: string;
  customizationType?: string;
  basePrice: number;
  currency?: string;
  status?: string;
  featured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  metadata?: object;
  categoryId: string;
  subcategoryId?: string;
}

export interface CreateVariantData {
  name: string;
  sku?: string;
  size?: string;
  material?: string;
  color?: string;
  finish?: string;
  dimensions?: string;
  price: number;
  stock?: number;
  isDefault?: boolean;
  metadata?: object;
}

export interface CreateImageData {
  imageUrl: string;
  variantId?: string;
  altText?: string;
  displayOrder?: number;
  isPrimary?: boolean;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Find product by ID or slug
 */
async function findProductByIdOrSlug(idOrSlug: string) {
  const isUUID = idOrSlug.length === 36 && idOrSlug.includes('-');
  return prisma.product.findFirst({
    where: isUUID ? { id: idOrSlug } : { slug: idOrSlug },
    select: { id: true },
  });
}

// ============================================
// Product Operations
// ============================================

/**
 * List products with filtering and pagination
 */
export async function listProducts(params: ProductListParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 12));
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.ProductWhereInput = {};

  // Dynamic category filtering
  if (params.categoryId) {
    where.categoryId = params.categoryId;
  } else if (params.categorySlug) {
    const cat = await prisma.category.findUnique({ where: { slug: params.categorySlug } });
    if (cat) where.categoryId = cat.id;
  }

  // Legacy category enum filtering
  if (params.category) {
    where.legacyCategory = params.category as ProductCategory;
  }

  // Dynamic subcategory filtering
  if (params.subcategoryId) {
    where.subcategoryId = params.subcategoryId;
  } else if (params.subcategorySlug) {
    const subcat = await prisma.subcategory.findUnique({ where: { slug: params.subcategorySlug } });
    if (subcat) where.subcategoryId = subcat.id;
  }

  if (params.customizationType) where.customizationType = params.customizationType as CustomizationType;
  if (params.status) where.status = params.status as ProductStatus;
  if (params.featured) where.featured = true;
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { description: { contains: params.search, mode: 'insensitive' } },
      { seoKeywords: { contains: params.search, mode: 'insensitive' } },
    ];
  }

  // Map sortBy to actual database fields
  const sortFieldMap: Record<string, string> = {
    name: 'name',
    price: 'basePrice',
    createdAt: 'createdAt',
    featured: 'featured',
  };
  const actualSortField = sortFieldMap[params.sortBy || 'createdAt'] || 'createdAt';

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [actualSortField]: params.sortOrder || 'desc' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        images: { where: { isPrimary: true }, take: 1 },
        variants: { where: { isDefault: true }, take: 1 },
        _count: { select: { variants: true, templates: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    success: true,
    data: {
      products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  };
}

/**
 * Get a single product by ID or slug
 */
export async function getProduct(idOrSlug: string): Promise<ServiceResult<unknown>> {
  const isUUID = idOrSlug.length === 36 && idOrSlug.includes('-');

  const product = await prisma.product.findFirst({
    where: isUUID ? { id: idOrSlug } : { slug: idOrSlug },
    include: {
      category: true,
      subcategory: true,
      variants: {
        orderBy: { isDefault: 'desc' },
        include: { images: true },
      },
      images: { orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }] },
      templates: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  return { success: true, data: product };
}

/**
 * Create a new product
 */
export async function createProduct(data: CreateProductData): Promise<ServiceResult<unknown>> {
  const product = await prisma.product.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description || '',
      legacyCategory: (data.legacyCategory || 'CUSTOM_ORDER') as ProductCategory,
      legacyProductType: (data.legacyProductType || 'TSHIRT') as ProductType,
      customizationType: (data.customizationType || 'PRINT') as CustomizationType,
      basePrice: data.basePrice,
      currency: data.currency || 'GBP',
      status: (data.status || 'DRAFT') as ProductStatus,
      featured: data.featured || false,
      ...(data.seoTitle && { seoTitle: data.seoTitle }),
      ...(data.seoDescription && { seoDescription: data.seoDescription }),
      ...(data.seoKeywords && { seoKeywords: data.seoKeywords }),
      ...(data.metadata && { metadata: data.metadata as Prisma.InputJsonValue }),
      category: { connect: { id: data.categoryId } },
      subcategory: data.subcategoryId ? { connect: { id: data.subcategoryId } } : undefined,
    },
    include: {
      category: true,
      subcategory: true,
      variants: true,
      images: true,
      templates: true,
    },
  });

  return { success: true, data: product };
}

/**
 * Update a product
 */
export async function updateProduct(id: string, data: Partial<CreateProductData>): Promise<ServiceResult<unknown>> {
  const existingProduct = await prisma.product.findUnique({ where: { id } });

  if (!existingProduct) {
    return { success: false, error: 'Product not found' };
  }

  const product = await prisma.product.update({
    where: { id },
    data: data as Prisma.ProductUpdateInput,
    include: {
      category: true,
      subcategory: true,
      variants: true,
      images: true,
      templates: true,
    },
  });

  return { success: true, data: product };
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string): Promise<ServiceResult<null>> {
  const existingProduct = await prisma.product.findUnique({ where: { id } });

  if (!existingProduct) {
    return { success: false, error: 'Product not found' };
  }

  await prisma.product.delete({ where: { id } });

  return { success: true };
}

/**
 * Get product filter options
 */
export async function getProductFilters(category?: string, productType?: string) {
  const productWhere: Record<string, unknown> = { status: 'ACTIVE' };

  if (category) productWhere.legacyCategory = category;
  if (productType) productWhere.legacyProductType = productType;

  const matchingProducts = await prisma.product.findMany({
    where: productWhere,
    select: { id: true },
  });
  const productIds = matchingProducts.map((p) => p.id);

  const [materialGroups, sizeGroups, priceAgg] = await Promise.all([
    prisma.productVariant.groupBy({
      by: ['material'],
      where: { productId: { in: productIds }, material: { not: null } },
      _count: { material: true },
    }),
    prisma.productVariant.groupBy({
      by: ['size'],
      where: { productId: { in: productIds }, size: { not: null } },
      _count: { size: true },
    }),
    prisma.product.aggregate({
      where: productWhere,
      _min: { basePrice: true },
      _max: { basePrice: true },
    }),
  ]);

  return {
    success: true,
    data: {
      materials: materialGroups
        .filter((g) => g.material !== null)
        .map((g) => ({ value: g.material as string, count: g._count.material })),
      sizes: sizeGroups
        .filter((g) => g.size !== null)
        .map((g) => ({ value: g.size as string, count: g._count.size })),
      priceRange: {
        min: priceAgg._min.basePrice ? Number(priceAgg._min.basePrice) : 0,
        max: priceAgg._max.basePrice ? Number(priceAgg._max.basePrice) : 100,
      },
    },
  };
}

// ============================================
// Variant Operations
// ============================================

/**
 * List variants for a product
 */
export async function listVariants(productIdOrSlug: string): Promise<ServiceResult<unknown>> {
  const product = await findProductByIdOrSlug(productIdOrSlug);

  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  const variants = await prisma.productVariant.findMany({
    where: { productId: product.id },
    include: { images: { orderBy: { displayOrder: 'asc' } } },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });

  return { success: true, data: variants };
}

/**
 * Get a single variant
 */
export async function getVariant(productIdOrSlug: string, variantId: string): Promise<ServiceResult<unknown>> {
  const product = await findProductByIdOrSlug(productIdOrSlug);

  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, productId: product.id },
    include: { images: { orderBy: { displayOrder: 'asc' } } },
  });

  if (!variant) {
    return { success: false, error: 'Variant not found' };
  }

  return { success: true, data: variant };
}

/**
 * Create a variant
 */
export async function createVariant(
  productIdOrSlug: string,
  data: CreateVariantData
): Promise<ServiceResult<unknown>> {
  const product = await findProductByIdOrSlug(productIdOrSlug);

  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  // Check for duplicate SKU
  if (data.sku) {
    const existingSku = await prisma.productVariant.findUnique({ where: { sku: data.sku } });
    if (existingSku) {
      return { success: false, error: 'SKU already exists' };
    }
  }

  // If this is set as default, unset other defaults
  if (data.isDefault) {
    await prisma.productVariant.updateMany({
      where: { productId: product.id },
      data: { isDefault: false },
    });
  }

  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      name: data.name,
      sku: data.sku || null,
      size: data.size || null,
      material: data.material || null,
      color: data.color || null,
      finish: data.finish || null,
      ...(data.dimensions && { dimensions: data.dimensions as Prisma.InputJsonValue }),
      price: data.price,
      stock: data.stock || 0,
      isDefault: data.isDefault || false,
      ...(data.metadata && { metadata: data.metadata as Prisma.InputJsonValue }),
    },
    include: { images: true },
  });

  return { success: true, data: variant };
}

/**
 * Update a variant
 */
export async function updateVariant(
  productIdOrSlug: string,
  variantId: string,
  data: Partial<CreateVariantData>
): Promise<ServiceResult<unknown>> {
  const product = await findProductByIdOrSlug(productIdOrSlug);

  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  const existingVariant = await prisma.productVariant.findFirst({
    where: { id: variantId, productId: product.id },
  });

  if (!existingVariant) {
    return { success: false, error: 'Variant not found' };
  }

  // Check for duplicate SKU if changed
  if (data.sku && data.sku !== existingVariant.sku) {
    const existingSku = await prisma.productVariant.findFirst({
      where: { sku: data.sku, NOT: { id: variantId } },
    });
    if (existingSku) {
      return { success: false, error: 'SKU already exists' };
    }
  }

  // If this is set as default, unset other defaults
  if (data.isDefault && !existingVariant.isDefault) {
    await prisma.productVariant.updateMany({
      where: { productId: product.id, NOT: { id: variantId } },
      data: { isDefault: false },
    });
  }

  const variant = await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      name: data.name !== undefined ? data.name : existingVariant.name,
      sku: data.sku !== undefined ? data.sku || null : existingVariant.sku,
      size: data.size !== undefined ? data.size || null : existingVariant.size,
      material: data.material !== undefined ? data.material || null : existingVariant.material,
      color: data.color !== undefined ? data.color || null : existingVariant.color,
      finish: data.finish !== undefined ? data.finish || null : existingVariant.finish,
      ...(data.dimensions !== undefined && { dimensions: data.dimensions as Prisma.InputJsonValue }),
      price: data.price !== undefined ? data.price : existingVariant.price,
      stock: data.stock !== undefined ? data.stock : existingVariant.stock,
      isDefault: data.isDefault !== undefined ? data.isDefault : existingVariant.isDefault,
      ...(data.metadata !== undefined && { metadata: data.metadata as Prisma.InputJsonValue }),
    },
    include: { images: true },
  });

  return { success: true, data: variant };
}

/**
 * Delete a variant
 */
export async function deleteVariant(productIdOrSlug: string, variantId: string): Promise<ServiceResult<null>> {
  const product = await findProductByIdOrSlug(productIdOrSlug);

  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, productId: product.id },
  });

  if (!variant) {
    return { success: false, error: 'Variant not found' };
  }

  // Check if variant is used in any orders
  const orderItemCount = await prisma.orderItem.count({ where: { variantId } });

  if (orderItemCount > 0) {
    return { success: false, error: `Cannot delete variant. It is used in ${orderItemCount} order(s).` };
  }

  await prisma.productVariant.delete({ where: { id: variantId } });

  return { success: true };
}

// ============================================
// Image Operations
// ============================================

/**
 * List images for a product
 */
export async function listImages(productIdOrSlug: string): Promise<ServiceResult<unknown>> {
  const product = await findProductByIdOrSlug(productIdOrSlug);

  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  const images = await prisma.productImage.findMany({
    where: { productId: product.id },
    include: { variant: { select: { id: true, name: true } } },
    orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return { success: true, data: images };
}

/**
 * Get a single image
 */
export async function getImage(productIdOrSlug: string, imageId: string): Promise<ServiceResult<unknown>> {
  const product = await findProductByIdOrSlug(productIdOrSlug);

  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  const image = await prisma.productImage.findFirst({
    where: { id: imageId, productId: product.id },
    include: { variant: { select: { id: true, name: true } } },
  });

  if (!image) {
    return { success: false, error: 'Image not found' };
  }

  return { success: true, data: image };
}

/**
 * Create an image
 */
export async function createImage(productIdOrSlug: string, data: CreateImageData): Promise<ServiceResult<unknown>> {
  const product = await findProductByIdOrSlug(productIdOrSlug);

  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  // Validate variant if provided
  if (data.variantId) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: data.variantId, productId: product.id },
    });
    if (!variant) {
      return { success: false, error: 'Variant not found' };
    }
  }

  // If this is set as primary, unset other primary images
  if (data.isPrimary) {
    await prisma.productImage.updateMany({
      where: { productId: product.id },
      data: { isPrimary: false },
    });
  }

  // Get next display order
  const maxOrder = await prisma.productImage.aggregate({
    where: { productId: product.id },
    _max: { displayOrder: true },
  });
  const nextOrder = (maxOrder._max.displayOrder ?? -1) + 1;

  const image = await prisma.productImage.create({
    data: {
      productId: product.id,
      variantId: data.variantId || null,
      imageUrl: data.imageUrl,
      altText: data.altText || null,
      displayOrder: data.displayOrder ?? nextOrder,
      isPrimary: data.isPrimary || false,
    },
    include: { variant: { select: { id: true, name: true } } },
  });

  return { success: true, data: image };
}

/**
 * Update an image
 */
export async function updateImage(
  productIdOrSlug: string,
  imageId: string,
  data: Partial<CreateImageData>
): Promise<ServiceResult<unknown>> {
  const product = await findProductByIdOrSlug(productIdOrSlug);

  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  const existingImage = await prisma.productImage.findFirst({
    where: { id: imageId, productId: product.id },
  });

  if (!existingImage) {
    return { success: false, error: 'Image not found' };
  }

  // Validate variant if provided
  if (data.variantId) {
    const variant = await prisma.productVariant.findFirst({
      where: { id: data.variantId, productId: product.id },
    });
    if (!variant) {
      return { success: false, error: 'Variant not found' };
    }
  }

  // If this is set as primary, unset other primary images
  if (data.isPrimary && !existingImage.isPrimary) {
    await prisma.productImage.updateMany({
      where: { productId: product.id, NOT: { id: imageId } },
      data: { isPrimary: false },
    });
  }

  const image = await prisma.productImage.update({
    where: { id: imageId },
    data: {
      variantId: data.variantId !== undefined ? data.variantId || null : existingImage.variantId,
      imageUrl: data.imageUrl !== undefined ? data.imageUrl : existingImage.imageUrl,
      altText: data.altText !== undefined ? data.altText || null : existingImage.altText,
      displayOrder: data.displayOrder !== undefined ? data.displayOrder : existingImage.displayOrder,
      isPrimary: data.isPrimary !== undefined ? data.isPrimary : existingImage.isPrimary,
    },
    include: { variant: { select: { id: true, name: true } } },
  });

  return { success: true, data: image };
}

/**
 * Delete an image
 */
export async function deleteImage(productIdOrSlug: string, imageId: string): Promise<ServiceResult<null>> {
  const product = await findProductByIdOrSlug(productIdOrSlug);

  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  const image = await prisma.productImage.findFirst({
    where: { id: imageId, productId: product.id },
  });

  if (!image) {
    return { success: false, error: 'Image not found' };
  }

  await prisma.productImage.delete({ where: { id: imageId } });

  // If this was the primary image, set the next image as primary
  if (image.isPrimary) {
    const nextImage = await prisma.productImage.findFirst({
      where: { productId: product.id },
      orderBy: { displayOrder: 'asc' },
    });
    if (nextImage) {
      await prisma.productImage.update({
        where: { id: nextImage.id },
        data: { isPrimary: true },
      });
    }
  }

  return { success: true };
}

/**
 * Reorder images
 */
export async function reorderImages(productIdOrSlug: string, imageIds: string[]): Promise<ServiceResult<unknown>> {
  const product = await findProductByIdOrSlug(productIdOrSlug);

  if (!product) {
    return { success: false, error: 'Product not found' };
  }

  if (!Array.isArray(imageIds)) {
    return { success: false, error: 'imageIds must be an array' };
  }

  // Update display order for each image
  const updates = imageIds.map((imageId: string, index: number) =>
    prisma.productImage.updateMany({
      where: { id: imageId, productId: product.id },
      data: { displayOrder: index },
    })
  );

  await prisma.$transaction(updates);

  // Return updated images
  const images = await prisma.productImage.findMany({
    where: { productId: product.id },
    orderBy: { displayOrder: 'asc' },
  });

  return { success: true, data: images };
}
