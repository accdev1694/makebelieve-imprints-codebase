/* eslint-disable @typescript-eslint/no-explicit-any */
import apiClient from './client';
import { Category, Subcategory } from './categories';
import {
  ProductCategory,
  ProductType,
  CustomizationType,
  ProductStatus,
  PRODUCT_CATEGORY_LABELS,
} from '@mkbl/shared';

// Re-export shared types for convenience
export type { ProductCategory, ProductType, CustomizationType, ProductStatus };

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
  // New variant-based filters
  materials?: string[];
  sizes?: string[];
  minPrice?: number;
  maxPrice?: number;
}

export interface ProductFilters {
  category: ProductCategory | 'all';
  productType: ProductType | 'all';
  customizationType: CustomizationType | 'all';
  featured: boolean | null;
  search: string;
  sortBy: 'name' | 'price' | 'createdAt' | 'featured';
  sortOrder: 'asc' | 'desc';
  // New filters
  materials: string[];
  sizes: string[];
  minPrice: number | null;
  maxPrice: number | null;
}

export interface FilterOption {
  value: string;
  count: number;
}

export interface FiltersResponse {
  materials: FilterOption[];
  sizes: FilterOption[];
  priceRange: {
    min: number;
    max: number;
  };
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
    // New variant-based filters
    if (params.materials && params.materials.length > 0) {
      searchParams.set('materials', params.materials.join(','));
    }
    if (params.sizes && params.sizes.length > 0) {
      searchParams.set('sizes', params.sizes.join(','));
    }
    if (params.minPrice !== undefined) searchParams.set('minPrice', params.minPrice.toString());
    if (params.maxPrice !== undefined) searchParams.set('maxPrice', params.maxPrice.toString());

    const response = await apiClient.get<ProductsListResponse>(
      `/products?${searchParams.toString()}`
    );
    return response.data;
  },

  /**
   * Get available filter options (materials, sizes, price range)
   */
  async getFilters(category?: ProductCategory, productType?: ProductType): Promise<FiltersResponse> {
    const searchParams = new URLSearchParams();
    if (category) searchParams.set('category', category);
    if (productType) searchParams.set('productType', productType);

    const queryString = searchParams.toString();
    const response = await apiClient.get<FiltersResponse>(
      `/products/filters${queryString ? `?${queryString}` : ''}`
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
 * Category display labels (using shared constants with local overrides)
 */
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  ...PRODUCT_CATEGORY_LABELS,
  SUBLIMATION: 'Home & Lifestyle', // Override for display
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
