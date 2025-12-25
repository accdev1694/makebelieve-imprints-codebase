'use client';

import Link from 'next/link';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Home, FileText, Maximize2, Image, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { NavCategory } from '@/lib/types';

const CATEGORIES: NavCategory[] = [
  {
    label: 'Home & Lifestyle',
    href: '/home-lifestyle',
    description: 'Mugs, t-shirts, cushions & more',
    icon: Home,
  },
  {
    label: 'Stationery',
    href: '/stationery',
    description: 'Business cards, brochures, letterheads',
    icon: FileText,
  },
  {
    label: 'Large Format',
    href: '/large-format',
    description: 'Banners, posters, signage',
    icon: Maximize2,
  },
  {
    label: 'Photo Prints',
    href: '/photo-prints',
    description: 'Canvas, framed prints, albums',
    icon: Image,
  },
  {
    label: 'Digital Downloads',
    href: '/digital-downloads',
    description: 'Templates & digital products',
    icon: Download,
  },
];

export function DesktopNav() {
  return (
    <nav className="hidden lg:flex items-center gap-1">
      {/* Products Dropdown */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="ghost" className="gap-1">
            Products
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className={cn(
              'z-50 min-w-[320px] overflow-hidden rounded-lg',
              'bg-popover border border-border p-2 shadow-lg',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'data-[side=bottom]:slide-in-from-top-2'
            )}
            sideOffset={8}
          >
            {CATEGORIES.map((category) => (
              <DropdownMenu.Item key={category.href} asChild>
                <Link
                  href={category.href}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-md',
                    'cursor-pointer outline-none',
                    'hover:bg-accent focus:bg-accent',
                    'transition-colors'
                  )}
                >
                  <category.icon className="h-5 w-5 mt-0.5 text-primary" />
                  <div>
                    <div className="font-medium">{category.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {category.description}
                    </div>
                  </div>
                </Link>
              </DropdownMenu.Item>
            ))}

            <DropdownMenu.Separator className="h-px bg-border my-2" />

            <DropdownMenu.Item asChild>
              <Link
                href="/products"
                className={cn(
                  'flex items-center justify-center p-2 rounded-md',
                  'cursor-pointer outline-none text-sm font-medium',
                  'hover:bg-accent focus:bg-accent',
                  'text-primary'
                )}
              >
                View All Products
              </Link>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {/* Templates Link */}
      <Link href="/templates">
        <Button variant="ghost">Templates</Button>
      </Link>

      {/* About Link */}
      <Link href="/about">
        <Button variant="ghost">About</Button>
      </Link>

      {/* Contact Link */}
      <Link href="/contact">
        <Button variant="ghost">Contact</Button>
      </Link>
    </nav>
  );
}
