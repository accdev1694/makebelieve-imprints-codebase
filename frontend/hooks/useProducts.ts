'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productsService, ProductsListParams, Product } from '@/lib/api/products';

// Query keys for cache management
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: ProductsListParams) => [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

/**
 * Hook for fetching paginated products with caching
 */
export function useProducts(params: ProductsListParams = {}) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productsService.list(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });
}

/**
 * Hook for fetching a single product with caching
 */
export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productsService.get(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for prefetching products (for hover prefetch)
 */
export function usePrefetchProduct() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: productKeys.detail(id),
      queryFn: () => productsService.get(id),
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * Hook for prefetching product list
 */
export function usePrefetchProducts() {
  const queryClient = useQueryClient();

  return (params: ProductsListParams) => {
    queryClient.prefetchQuery({
      queryKey: productKeys.list(params),
      queryFn: () => productsService.list(params),
      staleTime: 2 * 60 * 1000,
    });
  };
}
