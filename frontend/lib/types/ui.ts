/**
 * UI Component Types
 *
 * Shared types for UI components that don't belong in @mkbl/shared
 * These are frontend-specific presentation types.
 */

/**
 * Option for variant selector component (size, material, color, etc.)
 */
export interface VariantOption {
  id: string;
  name: string;
  available: boolean;
  price?: number;
}

/**
 * Selected variant state for add-to-cart section
 */
export interface SelectedVariant {
  id?: string;
  name?: string;
  size?: string;
  color?: string;
  material?: string;
  finish?: string;
}
