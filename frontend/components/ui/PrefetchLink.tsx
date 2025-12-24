'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ReactNode, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { productsService } from '@/lib/api/products';
import { categoriesService } from '@/lib/api/categories';
import { productKeys } from '@/hooks/useProducts';
import { categoryKeys } from '@/hooks/useCategories';

interface PrefetchLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  prefetchType?: 'product' | 'category' | 'products-list' | 'none';
  prefetchId?: string;
  prefetchParams?: Record<string, unknown>;
}

/**
 * A Link component that prefetches data on hover/focus
 * for faster page transitions
 */
export function PrefetchLink({
  href,
  children,
  className,
  prefetchType = 'none',
  prefetchId,
  prefetchParams,
}: PrefetchLinkProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const prefetchedRef = useRef(false);

  const handlePrefetch = useCallback(() => {
    // Only prefetch once per mount
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;

    // Prefetch the Next.js route
    router.prefetch(href);

    // Prefetch the data based on type
    switch (prefetchType) {
      case 'product':
        if (prefetchId) {
          queryClient.prefetchQuery({
            queryKey: productKeys.detail(prefetchId),
            queryFn: () => productsService.get(prefetchId),
            staleTime: 5 * 60 * 1000,
          });
        }
        break;

      case 'category':
        if (prefetchId) {
          queryClient.prefetchQuery({
            queryKey: categoryKeys.detail(prefetchId),
            queryFn: () => categoriesService.get(prefetchId),
            staleTime: 10 * 60 * 1000,
          });
        }
        break;

      case 'products-list':
        queryClient.prefetchQuery({
          queryKey: productKeys.list(prefetchParams || {}),
          queryFn: () => productsService.list(prefetchParams || {}),
          staleTime: 2 * 60 * 1000,
        });
        break;
    }
  }, [href, prefetchType, prefetchId, prefetchParams, router, queryClient]);

  return (
    <Link
      href={href}
      className={className}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      onTouchStart={handlePrefetch}
    >
      {children}
    </Link>
  );
}
