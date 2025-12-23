import apiClient from './client';
import { Category, Subcategory } from './categories';

// Legacy enums - kept for backward compatibility
export type ProductCategory =
  | 'SUBLIMATION'
  | 'STATIONERY'
  | 'LARGE_FORMAT'
  | 'PHOTO_PRINTS'
  | 'DIGITAL'
  | 'CUSTOM_ORDER';

export type ProductType =
  | 'TSHIRT'
  | 'MUG'
  | 'WATER_BOTTLE'
  | 'MOUSEMAT'
  | 'KEYCHAIN'
  | 'CUSHION_PILLOW'
  | 'BUSINESS_CARD'
  | 'LEAFLET'
  | 'GREETING_CARD'
  | 'POSTCARD'
  | 'BANNER'
  | 'POSTER'
  | 'CANVAS_PRINT'
  | 'ALUMINUM_PRINT'
  | 'PHOTO_PAPER_PRINT'
  | 'ACRYLIC_LED_PRINT'
  | 'DIGITAL_PDF';

export type CustomizationType =
  | 'TEMPLATE_BASED'
  | 'UPLOAD_OWN'
  | 'FULLY_CUSTOM'
  | 'DIGITAL_DOWNLOAD';

export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'OUT_OF_STOCK';

// Re-export category types for convenience
export type { Category, Subcategory };

export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  altText?: string;
  displayOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  size?: string;
  color?: string;
  material?: string;
  finish?: string;
  orientation?: string;
  dimensions?: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  lowStockThreshold?: number;
  isDefault: boolean;
  isActive: boolean;
  weight?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductTemplate {
  id: string;
  productId: string;
  name: string;
  description?: string;
  thumbnailUrl: string;
  designFileUrl: string;
  category?: string;
  tags?: string;
  isPremium: boolean;
  price: number;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  // Dynamic category relations (new)
  categoryId: string;
  subcategoryId?: string | null;
  category: Category;
  subcategory?: Subcategory | null;
  // Legacy enum fields (kept for backward compatibility)
  legacyCategory?: ProductCategory;
  legacyProductType?: ProductType;
  customizationType: CustomizationType;
  basePrice: number;
  currency: string;
  status: ProductStatus;
  featured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  images?: ProductImage[];
  variants?: ProductVariant[];
  templates?: ProductTemplate[];
  _count?: {
    variants: number;
    templates: number;
  };
}

export interface ProductsListResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductsListParams {
  page?: number;
  limit?: number;
  // Dynamic category filtering (new)
  categoryId?: string;
  categorySlug?: string;
  subcategoryId?: string;
  subcategorySlug?: string;
  // Legacy enum filtering (kept for backward compatibility)
  category?: ProductCategory;
  productType?: ProductType;
  customizationType?: CustomizationType;
  status?: ProductStatus;
  featured?: boolean;
  search?: string;
  sortBy?: 'name' | 'price' | 'createdAt' | 'featured';
  sortOrder?: 'asc' | 'desc';
}

export interface ProductFilters {
  category: ProductCategory | 'all';
  productType: ProductType | 'all';
  customizationType: CustomizationType | 'all';
  featured: boolean | null;
  search: string;
  sortBy: 'name' | 'price' | 'createdAt' | 'featured';
  sortOrder: 'asc' | 'desc';
}

/**
 * Products Service
 * Handles all product-related API calls
 */
export const productsService = {
  /**
   * Get all products with filtering and pagination
   */
  async list(params: ProductsListParams = {}): Promise<ProductsListResponse> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    // Dynamic category filtering (new)
    if (params.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params.categorySlug) searchParams.set('categorySlug', params.categorySlug);
    if (params.subcategoryId) searchParams.set('subcategoryId', params.subcategoryId);
    if (params.subcategorySlug) searchParams.set('subcategorySlug', params.subcategorySlug);
    // Legacy enum filtering
    if (params.category) searchParams.set('category', params.category);
    if (params.productType) searchParams.set('productType', params.productType);
    if (params.customizationType) searchParams.set('customizationType', params.customizationType);
    if (params.status) searchParams.set('status', params.status);
    if (params.featured !== undefined) searchParams.set('featured', params.featured.toString());
    if (params.search) searchParams.set('search', params.search);
    if (params.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const response = await apiClient.get<ProductsListResponse>(
      `/products?${searchParams.toString()}`
    );
    return response.data;
  },

  /**
   * Get a specific product by ID
   */
  async get(id: string): Promise<Product> {
    const response = await apiClient.get<Product>(`/products/${id}`);
    return response.data;
  },

  /**
   * Get all variants for a product
   */
  async getVariants(productId: string): Promise<ProductVariant[]> {
    const response = await apiClient.get<ProductVariant[]>(
      `/products/${productId}/variants`
    );
    return response.data;
  },

  /**
   * Get all templates for a product
   */
  async getTemplates(productId: string): Promise<ProductTemplate[]> {
    const response = await apiClient.get<ProductTemplate[]>(
      `/products/${productId}/templates`
    );
    return response.data;
  },
};

/**
 * Category display labels
 */
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  SUBLIMATION: 'Home & Lifestyle',
  STATIONERY: 'Stationery',
  LARGE_FORMAT: 'Large Format',
  PHOTO_PRINTS: 'Photo Prints',
  DIGITAL: 'Digital',
  CUSTOM_ORDER: 'Custom Order',
};

/**
 * Product type display labels
 */
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  TSHIRT: 'T-Shirt',
  MUG: 'Mug',
  WATER_BOTTLE: 'Water Bottle',
  MOUSEMAT: 'Mousemat',
  KEYCHAIN: 'Keychain',
  CUSHION_PILLOW: 'Cushion Pillow',
  BUSINESS_CARD: 'Business Card',
  LEAFLET: 'Leaflet',
  GREETING_CARD: 'Greeting Card',
  POSTCARD: 'Postcard',
  BANNER: 'Banner',
  POSTER: 'Poster',
  CANVAS_PRINT: 'Canvas Print',
  ALUMINUM_PRINT: 'Aluminum Print',
  PHOTO_PAPER_PRINT: 'Photo Paper Print',
  ACRYLIC_LED_PRINT: 'Acrylic LED Print',
  DIGITAL_PDF: 'Digital PDF',
};

/**
 * Customization type display labels
 */
export const CUSTOMIZATION_TYPE_LABELS: Record<CustomizationType, string> = {
  TEMPLATE_BASED: 'Use a Template',
  UPLOAD_OWN: 'Upload Your Own',
  FULLY_CUSTOM: 'Fully Custom',
  DIGITAL_DOWNLOAD: 'Digital Download',
};

/**
 * Format price for display
 */
export const formatPrice = (price: number, currency: string = 'GBP'): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(price);
};
