'use client';

import { useQuery } from '@tanstack/react-query';
import { NotificationsResponse } from '@/app/api/notifications/route';

// Query keys for cache management
export const notificationKeys = {
  all: ['notifications'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
};

async function fetchNotifications(): Promise<NotificationsResponse> {
  const response = await fetch('/api/notifications', {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Not authenticated, return empty notifications
      return { totalCount: 0, items: [] };
    }
    throw new Error('Failed to fetch notifications');
  }

  return response.json();
}

/**
 * Hook for fetching user notifications with polling
 */
export function useNotifications(enabled: boolean = true) {
  const query = useQuery({
    queryKey: notificationKeys.list(),
    queryFn: fetchNotifications,
    enabled,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Poll every 60 seconds
    refetchIntervalInBackground: false, // Don't poll when tab is hidden
    retry: false, // Don't retry on auth failure
  });

  return {
    notifications: query.data?.items ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
