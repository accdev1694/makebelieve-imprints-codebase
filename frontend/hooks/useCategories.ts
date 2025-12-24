'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesService, Category, CategoriesListParams } from '@/lib/api/categories';

// Query keys for cache management
export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (params?: CategoriesListParams) => [...categoryKeys.lists(), params] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (idOrSlug: string) => [...categoryKeys.details(), idOrSlug] as const,
};

/**
 * Hook for fetching all categories with caching
 */
export function useCategories(params?: CategoriesListParams) {
  return useQuery({
    queryKey: categoryKeys.list(params),
    queryFn: () => categoriesService.list(params),
    staleTime: 10 * 60 * 1000, // Categories rarely change, cache for 10 minutes
  });
}

/**
 * Hook for fetching a single category by ID or slug
 */
export function useCategory(idOrSlug: string) {
  return useQuery({
    queryKey: categoryKeys.detail(idOrSlug),
    queryFn: () => categoriesService.get(idOrSlug),
    enabled: !!idOrSlug,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook for prefetching a category
 */
export function usePrefetchCategory() {
  const queryClient = useQueryClient();

  return (idOrSlug: string) => {
    queryClient.prefetchQuery({
      queryKey: categoryKeys.detail(idOrSlug),
      queryFn: () => categoriesService.get(idOrSlug),
      staleTime: 10 * 60 * 1000,
    });
  };
}
