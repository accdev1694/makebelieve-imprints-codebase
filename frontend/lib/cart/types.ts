/**
 * Cart Types
 *
 * Shared type definitions for cart functionality.
 */

// Cart item structure
export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  variantId?: string;
  variantName?: string;
  size?: string;
  color?: string;
  material?: string;
  finish?: string;
  quantity: number;
  unitPrice: number;
  customization?: CartItemCustomization;
  addedAt: string;
}

export interface CartItemCustomization {
  type: 'TEMPLATE_BASED' | 'UPLOAD_OWN' | 'FULLY_CUSTOM';
  templateId?: string;
  templateName?: string;
  designId?: string;
  designUrl?: string;
}

// Payload for adding items to cart
export interface AddToCartPayload {
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string;
  variantId?: string;
  variantName?: string;
  size?: string;
  color?: string;
  material?: string;
  finish?: string;
  quantity: number;
  unitPrice: number;
  customization?: CartItemCustomization;
}
