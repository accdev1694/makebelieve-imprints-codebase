'use client';

import { useState, useEffect } from 'react';
import {
  productsService,
  FiltersResponse,
  ProductCategory,
  ProductType,
} from '@/lib/api/products';

interface UseProductFilterOptionsParams {
  category?: ProductCategory | 'all';
  productType?: ProductType | 'all';
}

interface UseProductFilterOptionsResult {
  filterOptions: FiltersResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch available filter options (materials, sizes, price range)
 * Optionally filtered by category or product type
 */
export function useProductFilterOptions({
  category,
  productType,
}: UseProductFilterOptionsParams = {}): UseProductFilterOptionsResult {
  const [filterOptions, setFilterOptions] = useState<FiltersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFilters = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const categoryParam = category === 'all' ? undefined : category;
      const productTypeParam = productType === 'all' ? undefined : productType;
      const data = await productsService.getFilters(categoryParam, productTypeParam);
      setFilterOptions(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch filter options'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, productType]);

  return {
    filterOptions,
    isLoading,
    error,
    refetch: fetchFilters,
  };
}
