import prisma from '@/lib/prisma';

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==================== Category Types ====================

export interface ListCategoriesParams {
  includeInactive?: boolean;
  includeSubcategories?: boolean;
}

export interface CreateCategoryData {
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

// ==================== Subcategory Types ====================

export interface ListSubcategoriesParams {
  includeInactive?: boolean;
}

export interface CreateSubcategoryData {
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

// ==================== Category Operations ====================

/**
 * List all categories
 */
export async function listCategories(params: ListCategoriesParams = {}): Promise<ServiceResult<unknown>> {
  const { includeInactive = false, includeSubcategories = true } = params;

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

  return { success: true, data: { categories } };
}

/**
 * Get a single category by ID or slug
 */
export async function getCategory(idOrSlug: string): Promise<ServiceResult<unknown>> {
  const isUUID = idOrSlug.length === 36 && idOrSlug.includes('-');

  const category = await prisma.category.findFirst({
    where: isUUID ? { id: idOrSlug } : { slug: idOrSlug },
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
    return { success: false, error: 'Category not found' };
  }

  return { success: true, data: { category } };
}

/**
 * Create a new category
 */
export async function createCategory(data: CreateCategoryData): Promise<ServiceResult<unknown>> {
  // Check for duplicate slug
  const existing = await prisma.category.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return { success: false, error: 'A category with this slug already exists' };
  }

  const category = await prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      image: data.image,
      displayOrder: data.displayOrder ?? 0,
      isActive: data.isActive ?? true,
    },
    include: {
      subcategories: true,
      _count: {
        select: { products: true },
      },
    },
  });

  return { success: true, data: { category } };
}

/**
 * Update a category
 */
export async function updateCategory(
  id: string,
  data: Partial<CreateCategoryData>
): Promise<ServiceResult<unknown>> {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: 'Category not found' };
  }

  // Check for duplicate slug if changing
  if (data.slug && data.slug !== existing.slug) {
    const duplicateSlug = await prisma.category.findUnique({
      where: { slug: data.slug },
    });
    if (duplicateSlug) {
      return { success: false, error: 'A category with this slug already exists' };
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data,
    include: {
      subcategories: true,
      _count: {
        select: { products: true },
      },
    },
  });

  return { success: true, data: { category } };
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string): Promise<ServiceResult<null>> {
  const existing = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true, subcategories: true },
      },
    },
  });

  if (!existing) {
    return { success: false, error: 'Category not found' };
  }

  if (existing._count.products > 0) {
    return {
      success: false,
      error: `Cannot delete category with ${existing._count.products} products. Move or delete products first.`,
    };
  }

  await prisma.category.delete({ where: { id } });

  return { success: true, data: null };
}

// ==================== Subcategory Operations ====================

/**
 * List subcategories for a category
 */
export async function listSubcategories(
  categoryIdOrSlug: string,
  params: ListSubcategoriesParams = {}
): Promise<ServiceResult<unknown>> {
  const { includeInactive = false } = params;

  const isUUID = categoryIdOrSlug.length === 36 && categoryIdOrSlug.includes('-');

  // Find category by ID or slug
  const category = await prisma.category.findFirst({
    where: isUUID ? { id: categoryIdOrSlug } : { slug: categoryIdOrSlug },
  });

  if (!category) {
    return { success: false, error: 'Category not found' };
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

  return { success: true, data: { subcategories } };
}

/**
 * Get a single subcategory by ID or slug
 */
export async function getSubcategory(idOrSlug: string): Promise<ServiceResult<unknown>> {
  const isUUID = idOrSlug.length === 36 && idOrSlug.includes('-');

  const subcategory = await prisma.subcategory.findFirst({
    where: isUUID ? { id: idOrSlug } : { slug: idOrSlug },
    include: {
      category: true,
      _count: {
        select: { products: true },
      },
    },
  });

  if (!subcategory) {
    return { success: false, error: 'Subcategory not found' };
  }

  return { success: true, data: { subcategory } };
}

/**
 * Create a subcategory
 */
export async function createSubcategory(
  categoryId: string,
  data: CreateSubcategoryData
): Promise<ServiceResult<unknown>> {
  // Check category exists
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    return { success: false, error: 'Category not found' };
  }

  // Check for duplicate slug
  const existing = await prisma.subcategory.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return { success: false, error: 'A subcategory with this slug already exists' };
  }

  const subcategory = await prisma.subcategory.create({
    data: {
      categoryId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      image: data.image,
      displayOrder: data.displayOrder ?? 0,
      isActive: data.isActive ?? true,
    },
    include: {
      category: true,
      _count: {
        select: { products: true },
      },
    },
  });

  return { success: true, data: { subcategory } };
}

/**
 * Update a subcategory
 */
export async function updateSubcategory(
  id: string,
  data: Partial<CreateSubcategoryData>
): Promise<ServiceResult<unknown>> {
  const existing = await prisma.subcategory.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: 'Subcategory not found' };
  }

  // Check for duplicate slug if changing
  if (data.slug && data.slug !== existing.slug) {
    const duplicateSlug = await prisma.subcategory.findUnique({
      where: { slug: data.slug },
    });
    if (duplicateSlug) {
      return { success: false, error: 'A subcategory with this slug already exists' };
    }
  }

  const subcategory = await prisma.subcategory.update({
    where: { id },
    data,
    include: {
      category: true,
      _count: {
        select: { products: true },
      },
    },
  });

  return { success: true, data: { subcategory } };
}

/**
 * Delete a subcategory
 */
export async function deleteSubcategory(id: string): Promise<ServiceResult<null>> {
  const existing = await prisma.subcategory.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!existing) {
    return { success: false, error: 'Subcategory not found' };
  }

  if (existing._count.products > 0) {
    return {
      success: false,
      error: `Cannot delete subcategory with ${existing._count.products} products. Move or delete products first.`,
    };
  }

  await prisma.subcategory.delete({ where: { id } });

  return { success: true, data: null };
}
