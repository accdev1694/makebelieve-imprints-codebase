import { apiClient } from './client';

// Template types matching backend schema
export interface ProductTemplate {
  id: string;
  productId: string;
  name: string;
  description: string | null;
  thumbnailUrl: string;
  designFileUrl: string;
  category: string | null;
  tags: string[] | null;
  isPremium: boolean;
  price: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    category: string;
  };
}

export interface TemplatesListParams {
  page?: number;
  limit?: number;
  category?: string;
  productId?: string;
  isPremium?: boolean;
  search?: string;
  sortBy?: 'name' | 'price' | 'createdAt' | 'category';
  sortOrder?: 'asc' | 'desc';
}

export interface TemplatesListResponse {
  templates: ProductTemplate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Template category labels
export const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  birthday: 'Birthday',
  wedding: 'Wedding',
  anniversary: 'Anniversary',
  graduation: 'Graduation',
  baby: 'Baby & Kids',
  holiday: 'Holidays',
  business: 'Business',
  general: 'General',
};

// Templates API service
export const templatesService = {
  /**
   * List templates with optional filtering and pagination
   */
  async list(params: TemplatesListParams = {}): Promise<TemplatesListResponse> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.set('page', String(params.page));
    if (params.limit) queryParams.set('limit', String(params.limit));
    if (params.category) queryParams.set('category', params.category);
    if (params.productId) queryParams.set('productId', params.productId);
    if (params.isPremium !== undefined) queryParams.set('isPremium', String(params.isPremium));
    if (params.search) queryParams.set('search', params.search);
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);

    const queryString = queryParams.toString();
    const url = queryString ? `/templates?${queryString}` : '/templates';

    const response = await apiClient.get(url);
    // API returns { success: true, data: { templates, pagination } }
    return response.data.data || response.data;
  },

  /**
   * Get a single template by ID
   */
  async get(id: string): Promise<ProductTemplate> {
    const response = await apiClient.get(`/templates/${id}`);
    return response.data;
  },

  /**
   * Get templates for a specific product
   */
  async getByProduct(productId: string): Promise<ProductTemplate[]> {
    const response = await apiClient.get(`/products/${productId}/templates`);
    return response.data;
  },

  /**
   * Get all unique template categories
   */
  getCategories(): string[] {
    return Object.keys(TEMPLATE_CATEGORY_LABELS);
  },

  /**
   * Get display label for a category
   */
  getCategoryLabel(category: string): string {
    return TEMPLATE_CATEGORY_LABELS[category.toLowerCase()] || category;
  },
};
