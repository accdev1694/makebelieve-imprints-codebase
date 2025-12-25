'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X, ChevronRight, Home, FileText, Maximize2, Image, Download } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from './Logo';
import { HeaderSearch } from './HeaderSearch';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/api/auth';

interface Category {
  label: string;
  href: string;
  description: string;
  icon: React.ElementType;
}

const CATEGORIES: Category[] = [
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

const NAV_LINKS = [
  { label: 'All Products', href: '/products' },
  { label: 'Templates', href: '/templates' },
  { label: 'About Us', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'FAQ', href: '/faq' },
];

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogout: () => Promise<void>;
}

export function MobileMenu({ isOpen, onClose, user, onLogout }: MobileMenuProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />
        <Dialog.Content
          className={cn(
            'fixed left-0 top-0 z-50 h-full w-full max-w-sm',
            'bg-background shadow-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
            'duration-300'
          )}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <Logo />
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close menu</span>
                </Button>
              </Dialog.Close>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-border">
              <HeaderSearch />
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4">
              {/* Categories */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Categories
              </p>
              <div className="space-y-1 mb-6">
                {CATEGORIES.map((category) => (
                  <Link
                    key={category.href}
                    href={category.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg',
                      'hover:bg-accent transition-colors'
                    )}
                  >
                    <category.icon className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <span className="font-medium">{category.label}</span>
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>

              {/* Other Links */}
              <div className="h-px bg-border my-4" />
              <div className="space-y-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={onClose}
                    className="block p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>

            {/* Auth Section */}
            <div className="p-4 border-t border-border">
              {user ? (
                <div className="space-y-3">
                  <div className="text-sm">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-muted-foreground text-xs">{user.email}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" asChild>
                      <Link href="/dashboard" onClick={onClose}>
                        Dashboard
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        onLogout();
                        onClose();
                      }}
                    >
                      Logout
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" asChild>
                    <Link href="/auth/login" onClick={onClose}>
                      Login
                    </Link>
                  </Button>
                  <Button className="btn-gradient" asChild>
                    <Link href="/auth/register" onClick={onClose}>
                      Sign Up
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
