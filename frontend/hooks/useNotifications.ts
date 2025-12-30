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
 * Mark issue messages as read
 */
async function markIssueAsRead(issueId: string): Promise<void> {
  const response = await fetch(`/api/issues/${issueId}/mark-read`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    console.error('Failed to mark issue as read');
  }
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

  const markAsRead = async (notificationId: string, type: string) => {
    // Extract issue ID from notification ID (format: "issue-{id}")
    if (type === 'issue_response' || type === 'unread_messages') {
      const issueId = notificationId.replace('issue-', '');
      await markIssueAsRead(issueId);
      // Refetch to update the count
      query.refetch();
    }
  };

  return {
    notifications: query.data?.items ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    markAsRead,
  };
}
