'use client';

import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Bell,
  Mail,
  Package,
  MessageSquare,
  XCircle,
  ClipboardList,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/app/api/notifications/route';

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  email_confirmation: Mail,
  order_pending: Package,
  issue_response: MessageSquare,
  cancellation_update: XCircle,
  pending_orders: Package,
  issues_review: ClipboardList,
  cancellation_requests: XCircle,
  unread_messages: MessageSquare,
};

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { notifications, totalCount, isLoading } = useNotifications();

  const handleNotificationClick = (item: NotificationItem) => {
    if (item.action === 'mailto') {
      // Open email client
      window.open('mailto:', '_blank');
    }
    // For links, the Link component handles navigation
  };

  const renderNotificationItem = (item: NotificationItem) => {
    const Icon = NOTIFICATION_ICONS[item.type] || AlertCircle;
    const content = (
      <div
        className={cn(
          'flex items-start gap-3 px-3 py-2 text-sm rounded-md',
          'cursor-pointer outline-none',
          'hover:bg-accent focus:bg-accent',
          'transition-colors'
        )}
      >
        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm">{item.message}</p>
          {item.count && item.count > 1 && (
            <span className="text-xs text-muted-foreground">
              {item.count} items
            </span>
          )}
        </div>
      </div>
    );

    if (item.link) {
      return (
        <DropdownMenu.Item key={item.id} asChild>
          <Link href={item.link}>{content}</Link>
        </DropdownMenu.Item>
      );
    }

    if (item.action === 'mailto') {
      return (
        <DropdownMenu.Item
          key={item.id}
          onSelect={() => handleNotificationClick(item)}
        >
          {content}
        </DropdownMenu.Item>
      );
    }

    return (
      <DropdownMenu.Item key={item.id}>{content}</DropdownMenu.Item>
    );
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" className={cn('relative', className)}>
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 flex items-center justify-center',
                'min-w-[18px] h-[18px] px-1 rounded-full',
                'bg-destructive text-destructive-foreground',
                'text-[10px] font-medium'
              )}
            >
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          )}
          <span className="sr-only">
            {totalCount > 0 ? `${totalCount} notifications` : 'Notifications'}
          </span>
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            'z-50 w-80 max-h-96 overflow-y-auto',
            'bg-popover border border-border rounded-lg p-1 shadow-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[side=bottom]:slide-in-from-top-2'
          )}
          align="end"
          sideOffset={8}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="font-medium text-sm">Notifications</p>
            {totalCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {totalCount} pending action{totalCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          )}

          {/* Empty State */}
          {!isLoading && notifications.length === 0 && (
            <div className="px-3 py-6 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No pending actions</p>
            </div>
          )}

          {/* Notification Items */}
          {!isLoading &&
            notifications.map((item) => renderNotificationItem(item))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
