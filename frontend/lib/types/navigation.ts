/**
 * Navigation Types
 *
 * Shared types for navigation menu components (DesktopNav, MobileMenu)
 * Note: These are UI navigation types, distinct from product Category types in @mkbl/shared
 */

/**
 * Navigation category for the header dropdown menu
 */
export interface NavCategory {
  label: string;
  href: string;
  description: string;
  icon: React.ElementType;
}

/**
 * Simple navigation link
 */
export interface NavLink {
  label: string;
  href: string;
}
