'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CartIcon } from '@/components/cart/CartIcon';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Logo } from './header/Logo';
import { DesktopNav } from './header/DesktopNav';
import { HeaderSearch } from './header/HeaderSearch';
import { UserDropdown } from './header/UserDropdown';
import { NotificationBell } from './header/NotificationBell';
import { MobileMenu } from './header/MobileMenu';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface HeaderProps {
  variant?: 'default' | 'minimal' | 'transparent';
  showSearch?: boolean;
  showCart?: boolean;
  className?: string;
}

export function Header({
  variant = 'default',
  showSearch = true,
  showCart = true,
  className,
}: HeaderProps) {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const headerClasses = cn(
    'sticky top-0 z-50',
    {
      'border-b border-border/50 bg-card/65 backdrop-blur-sm': variant === 'default',
      'bg-transparent': variant === 'transparent',
      'border-b border-border bg-background': variant === 'minimal',
    },
    className
  );

  return (
    <>
      <header className={headerClasses}>
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <Logo />

            {/* Desktop Navigation */}
            <DesktopNav />

            {/* Search (Desktop) */}
            {showSearch && (
              <div className="hidden lg:block flex-1 max-w-md mx-4">
                <HeaderSearch />
              </div>
            )}

            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Notifications (only for logged-in users) */}
              {user && <NotificationBell />}

              {/* User Dropdown */}
              <UserDropdown />

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Cart */}
              {showCart && <CartIcon />}

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
}
