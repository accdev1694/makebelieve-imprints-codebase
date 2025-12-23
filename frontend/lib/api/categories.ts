import apiClient from './client';

// ============================================
// TYPES
// ============================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  subcategories?: Subcategory[];
  _count?: {
    products: number;
  };
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  _count?: {
    products: number;
  };
}

export interface CategoriesListParams {
  includeInactive?: boolean;
  includeSubcategories?: boolean;
}

export interface CreateCategoryData {
  name: string;
  slug: string;
  description?: string;
  image?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {}

export interface CreateSubcategoryData {
  name: string;
  slug: string;
  description?: string;
  image?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateSubcategoryData extends Partial<CreateSubcategoryData> {}

// ============================================
// CATEGORY API SERVICE
// ============================================

export const categoriesService = {
  /**
   * List all categories
   */
  async list(params?: CategoriesListParams): Promise<Category[]> {
    const queryParams = new URLSearchParams();
    if (params?.includeInactive) queryParams.set('includeInactive', 'true');
    if (params?.includeSubcategories === false) queryParams.set('includeSubcategories', 'false');

    const query = queryParams.toString();
    const response = await apiClient.get(`/categories${query ? `?${query}` : ''}`);
    return response.data.data.categories;
  },

  /**
   * Get a single category by ID or slug
   */
  async get(idOrSlug: string): Promise<Category> {
    const response = await apiClient.get(`/categories/${idOrSlug}`);
    return response.data.data.category;
  },

  /**
   * Create a new category (admin only)
   */
  async create(data: CreateCategoryData): Promise<Category> {
    const response = await apiClient.post('/categories', data);
    return response.data.data.category;
  },

  /**
   * Update a category (admin only)
   */
  async update(id: string, data: UpdateCategoryData): Promise<Category> {
    const response = await apiClient.put(`/categories/${id}`, data);
    return response.data.data.category;
  },

  /**
   * Delete a category (admin only)
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/categories/${id}`);
  },

  /**
   * Get subcategories for a category
   */
  async getSubcategories(categoryIdOrSlug: string, includeInactive?: boolean): Promise<Subcategory[]> {
    const query = includeInactive ? '?includeInactive=true' : '';
    const response = await apiClient.get(`/categories/${categoryIdOrSlug}/subcategories${query}`);
    return response.data.data.subcategories;
  },

  /**
   * Create a subcategory (admin only)
   */
  async createSubcategory(categoryId: string, data: CreateSubcategoryData): Promise<Subcategory> {
    const response = await apiClient.post(`/categories/${categoryId}/subcategories`, data);
    return response.data.data.subcategory;
  },

  /**
   * Get a single subcategory by ID or slug
   */
  async getSubcategory(idOrSlug: string): Promise<Subcategory> {
    const response = await apiClient.get(`/categories/subcategories/${idOrSlug}`);
    return response.data.data.subcategory;
  },

  /**
   * Update a subcategory (admin only)
   */
  async updateSubcategory(id: string, data: UpdateSubcategoryData): Promise<Subcategory> {
    const response = await apiClient.put(`/categories/subcategories/${id}`, data);
    return response.data.data.subcategory;
  },

  /**
   * Delete a subcategory (admin only)
   */
  async deleteSubcategory(id: string): Promise<void> {
    await apiClient.delete(`/categories/subcategories/${id}`);
  },

  /**
   * Generate a slug from a name
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get category image URL with fallback
 */
export function getCategoryImage(category: Category): string {
  if (category.image) return category.image;

  // Default images based on slug (local images preferred)
  const defaultImages: Record<string, string> = {
    'home-lifestyle': '/images/home-lifestyle.png',
    'stationery': 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80',
    'large-format': 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80',
    'photo-prints': 'https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?w=800&q=80',
    'digital': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
  };

  return defaultImages[category.slug] || 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=80';
}

/**
 * Get subcategory image URL with fallback
 */
export function getSubcategoryImage(subcategory: Subcategory): string {
  if (subcategory.image) return subcategory.image;

  // Default images based on slug
  const defaultImages: Record<string, string> = {
    'mugs': 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80',
    'keychains': 'https://images.unsplash.com/photo-1622219809260-ce5a59715896?w=800&q=80',
    'tshirts': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
    'water-bottles': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80',
    'throw-pillows': 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&q=80',
    'face-caps': 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&q=80',
    'business-cards': 'https://images.unsplash.com/photo-1589330273594-faddc14a63e9?w=800&q=80',
  };

  return defaultImages[subcategory.slug] || 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=80';
}
