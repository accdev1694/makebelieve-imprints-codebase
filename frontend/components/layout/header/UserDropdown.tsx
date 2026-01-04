'use client';

import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { User, LayoutDashboard, Package, Palette, Heart, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const MENU_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'My Orders', href: '/orders', icon: Package },
  { label: 'My Designs', href: '/design/my-designs', icon: Palette },
  { label: 'Favourites', href: '/account/wishlist', icon: Heart },
  { label: 'Settings', href: '/settings', icon: Settings },
];

const ADMIN_ITEM = { label: 'Admin Dashboard', href: '/admin', icon: ShieldCheck };

export function UserDropdown() {
  const { user, logout } = useAuth();
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

          {/* Admin Link (only for admins) */}
          {user.userType === 'PRINTER_ADMIN' && (
            <>
              <DropdownMenu.Item asChild>
                <Link
                  href={ADMIN_ITEM.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm rounded-md',
                    'cursor-pointer outline-none',
                    'hover:bg-accent focus:bg-accent',
                    'transition-colors text-primary font-medium'
                  )}
                >
                  <ADMIN_ITEM.icon className="h-4 w-4" />
                  {ADMIN_ITEM.label}
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="h-px bg-border my-1" />
            </>
          )}

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
              logout();
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
