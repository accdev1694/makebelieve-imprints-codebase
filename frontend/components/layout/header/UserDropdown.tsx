'use client';

import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { User, LayoutDashboard, Package, Palette, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { User as UserType } from '@/lib/api/auth';

interface UserDropdownProps {
  user: UserType | null;
  onLogout: () => Promise<void>;
}

const MENU_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Orders', href: '/orders', icon: Package },
  { label: 'My Designs', href: '/design/my-designs', icon: Palette },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function UserDropdown({ user, onLogout }: UserDropdownProps) {
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/auth/login">
          <Button variant="ghost" size="sm">
            Login
          </Button>
        </Link>
        <Link href="/auth/register">
          <Button className="btn-gradient" size="sm">
            Sign Up
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <User className="h-5 w-5" />
          <span className="sr-only">Account menu</span>
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={cn(
            'z-50 min-w-[200px] overflow-hidden rounded-lg',
            'bg-popover border border-border p-1 shadow-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[side=bottom]:slide-in-from-top-2'
          )}
          align="end"
          sideOffset={8}
        >
          {/* User Info */}
          <div className="px-3 py-2 border-b border-border mb-1">
            <p className="font-medium text-sm">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>

          {/* Menu Items */}
          {MENU_ITEMS.map((item) => (
            <DropdownMenu.Item key={item.href} asChild>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm rounded-md',
                  'cursor-pointer outline-none',
                  'hover:bg-accent focus:bg-accent',
                  'transition-colors'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </DropdownMenu.Item>
          ))}

          <DropdownMenu.Separator className="h-px bg-border my-1" />

          {/* Logout */}
          <DropdownMenu.Item
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-sm rounded-md',
              'cursor-pointer outline-none text-destructive',
              'hover:bg-destructive/10 focus:bg-destructive/10',
              'transition-colors'
            )}
            onSelect={(e: Event) => {
              e.preventDefault();
              onLogout();
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
