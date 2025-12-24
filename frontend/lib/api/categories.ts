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

export type UpdateCategoryData = Partial<CreateCategoryData>;

export interface CreateSubcategoryData {
  name: string;
  slug: string;
  description?: string;
  image?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export type UpdateSubcategoryData = Partial<CreateSubcategoryData>;

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
    // Home & Lifestyle
    'mugs': 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80',
    'keychains': 'https://images.unsplash.com/photo-1622219809260-ce5a59715896?w=800&q=80',
    'key-chains': 'https://images.unsplash.com/photo-1622219809260-ce5a59715896?w=800&q=80',
    'tshirts': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
    't-shirts': 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
    'water-bottles': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&q=80',
    'throw-pillows': 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&q=80',
    'cushions': 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&q=80',
    'face-caps': 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&q=80',
    'mouse-mats': 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80',
    'tote-bags': 'https://images.unsplash.com/photo-1597633425046-08f5110420b5?w=800&q=80',
    'phone-cases': 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&q=80',

    // Stationery
    'business-cards': 'https://images.unsplash.com/photo-1589330273594-faddc14a63e9?w=800&q=80',
    'leaflets': 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80',
    'flyers': 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80',
    'brochures': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80',
    'letterheads': 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80',
    'envelopes': 'https://images.unsplash.com/photo-1579751626657-72bc17010498?w=800&q=80',
    'notepads': 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=800&q=80',
    'folders': 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80',
    'postcards': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80',
    'booklets': 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80',

    // Large Format
    'vinyl-banners': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    'roll-up-banners': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80',
    'posters': 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80',
    'foam-boards': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    'correx-signs': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    'window-graphics': 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
    'wall-murals': 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80',
    'vehicle-wraps': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80',
    'a-frames': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',

    // Photo Prints
    'canvas': 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80',
    'aluminum': 'https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?w=800&q=80',
    'acrylic': 'https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?w=800&q=80',
    'acrylic-led': 'https://images.unsplash.com/photo-1452421822248-d4c2b47f0c81?w=800&q=80',
    'paper': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80',
    'framed': 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80',
    'photo-books': 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&q=80',
    'calendars': 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=800&q=80',

    // Digital Downloads
    'templates': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    'clipart': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
    'graphics': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80',
    'fonts': 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&q=80',
    'mockups': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    'design-bundles': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
  };

  return defaultImages[subcategory.slug] || 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=80';
}
