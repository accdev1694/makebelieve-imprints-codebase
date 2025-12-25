'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ProductFilters,
  ProductCategory,
  ProductType,
  CustomizationType,
} from '@/lib/api/products';

/**
 * Parse comma-separated string to array
 */
function parseArrayParam(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Custom hook for managing product filter state and URL synchronization
 * @returns Filter state and update functions
 */
export function useProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize filters from URL params
  const [filters, setFilters] = useState<ProductFilters>(() => ({
    category: (searchParams.get('category') as ProductCategory) || 'all',
    productType: (searchParams.get('productType') as ProductType) || 'all',
    customizationType: (searchParams.get('customizationType') as CustomizationType) || 'all',
    featured: searchParams.get('featured') === 'true' ? true : null,
    search: searchParams.get('search') || '',
    sortBy: (searchParams.get('sortBy') as any) || 'featured',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    // New filters
    materials: parseArrayParam(searchParams.get('materials')),
    sizes: parseArrayParam(searchParams.get('sizes')),
    minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : null,
    maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : null,
  }));

  /**
   * Update filters and sync with URL params
   */
  const updateFilters = useCallback(
    (newFilters: Partial<ProductFilters>) => {
      const updated = { ...filters, ...newFilters };
      setFilters(updated);

      // Update URL params
      const params = new URLSearchParams();
      Object.entries(updated).forEach(([key, value]) => {
        if (value === null || value === '' || value === 'all') return;
        if (Array.isArray(value)) {
          if (value.length > 0) {
            params.set(key, value.join(','));
          }
        } else if (value !== undefined) {
          params.set(key, String(value));
        }
      });

      const queryString = params.toString();
      router.push(queryString ? `/products?${queryString}` : '/products', { scroll: false });
    },
    [filters, router]
  );

  /**
   * Clear all filters and reset to defaults
   */
  const clearFilters = useCallback(() => {
    const cleared: ProductFilters = {
      category: 'all',
      productType: 'all',
      customizationType: 'all',
      featured: null,
      search: '',
      sortBy: 'featured',
      sortOrder: 'desc',
      materials: [],
      sizes: [],
      minPrice: null,
      maxPrice: null,
    };
    setFilters(cleared);
    router.push('/products');
  }, [router]);

  /**
   * Count the number of active filters (excluding defaults)
   */
  const activeFilterCount = useCallback(() => {
    let count = 0;
    if (filters.category !== 'all') count++;
    if (filters.productType !== 'all') count++;
    if (filters.customizationType !== 'all') count++;
    if (filters.featured !== null) count++;
    if (filters.search) count++;
    if (filters.sortBy !== 'featured' || filters.sortOrder !== 'desc') count++;
    if (filters.materials.length > 0) count++;
    if (filters.sizes.length > 0) count++;
    if (filters.minPrice !== null || filters.maxPrice !== null) count++;
    return count;
  }, [filters]);

  return {
    filters,
    updateFilters,
    clearFilters,
    activeFilterCount: activeFilterCount(),
  };
}
