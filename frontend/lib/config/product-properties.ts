import { ProductType } from '@mkbl/shared';

/**
 * Configuration for variant properties per product type
 * This defines the default properties shown when creating variants
 * Admins can add/remove properties per product using metadata
 */

export type PropertyInputType = 'text' | 'select' | 'color' | 'number';

export interface VariantPropertyConfig {
  key: 'size' | 'material' | 'color' | 'finish' | string;
  label: string;
  type: PropertyInputType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
}

export interface CustomProperty {
  key: string;
  label: string;
  value: string;
}

/**
 * Default variant properties for each product type
 */
export const PRODUCT_TYPE_PROPERTIES: Record<ProductType, VariantPropertyConfig[]> = {
  // Home & Lifestyle Products
  TSHIRT: [
    {
      key: 'size',
      label: 'Size',
      type: 'select',
      required: true,
      options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
    },
    {
      key: 'color',
      label: 'Color',
      type: 'color',
      required: true,
    },
    {
      key: 'material',
      label: 'Material',
      type: 'select',
      required: false,
      options: ['100% Cotton', 'Polyester', 'Cotton Blend', 'Organic Cotton'],
    },
  ],
  MUG: [
    {
      key: 'size',
      label: 'Size',
      type: 'select',
      required: true,
      options: ['11oz', '15oz'],
    },
    {
      key: 'material',
      label: 'Material',
      type: 'select',
      required: true,
      options: ['Ceramic', 'Glass', 'Enamel', 'Stainless Steel'],
    },
    {
      key: 'color',
      label: 'Handle Color',
      type: 'color',
      required: false,
    },
  ],
  WATER_BOTTLE: [
    {
      key: 'size',
      label: 'Capacity',
      type: 'select',
      required: true,
      options: ['350ml', '500ml', '750ml', '1L'],
    },
    {
      key: 'material',
      label: 'Material',
      type: 'select',
      required: true,
      options: ['Stainless Steel', 'Aluminum', 'BPA-Free Plastic', 'Glass'],
    },
    {
      key: 'color',
      label: 'Color',
      type: 'color',
      required: false,
    },
  ],
  MOUSEMAT: [
    {
      key: 'size',
      label: 'Size',
      type: 'select',
      required: true,
      options: ['Standard (24x20cm)', 'Large (30x25cm)', 'Extended (80x30cm)', 'XL Desk Mat (90x40cm)'],
    },
    {
      key: 'finish',
      label: 'Surface',
      type: 'select',
      required: false,
      options: ['Cloth', 'Hard Plastic', 'Leather'],
    },
  ],
  KEYCHAIN: [
    {
      key: 'material',
      label: 'Material',
      type: 'select',
      required: true,
      options: ['Acrylic', 'Metal', 'Wood', 'Leather', 'MDF'],
    },
    {
      key: 'size',
      label: 'Shape',
      type: 'select',
      required: false,
      options: ['Circle', 'Square', 'Rectangle', 'Heart', 'Star', 'Custom'],
    },
    {
      key: 'finish',
      label: 'Finish',
      type: 'select',
      required: false,
      options: ['Glossy', 'Matte', 'Brushed'],
    },
  ],
  CUSHION_PILLOW: [
    {
      key: 'size',
      label: 'Size',
      type: 'select',
      required: true,
      options: ['30x30cm', '40x40cm', '45x45cm', '50x50cm', '60x60cm'],
    },
    {
      key: 'material',
      label: 'Fabric',
      type: 'select',
      required: false,
      options: ['Cotton', 'Linen', 'Velvet', 'Polyester', 'Faux Suede'],
    },
    {
      key: 'finish',
      label: 'Backing',
      type: 'select',
      required: false,
      options: ['Same Print', 'Plain White', 'Plain Black'],
    },
  ],

  // Business Stationery
  BUSINESS_CARD: [
    {
      key: 'size',
      label: 'Size',
      type: 'select',
      required: true,
      options: ['Standard UK (85x55mm)', 'US Size (89x51mm)', 'Square (55x55mm)', 'Mini (70x28mm)'],
    },
    {
      key: 'material',
      label: 'Paper Stock',
      type: 'select',
      required: true,
      options: ['350gsm Silk', '350gsm Gloss', '400gsm Uncoated', '450gsm Premium', '600gsm Luxury'],
    },
    {
      key: 'finish',
      label: 'Finish',
      type: 'select',
      required: false,
      options: ['None', 'Matt Lamination', 'Gloss Lamination', 'Spot UV', 'Foil (Gold)', 'Foil (Silver)', 'Embossed'],
    },
  ],
  LEAFLET: [
    {
      key: 'size',
      label: 'Size',
      type: 'select',
      required: true,
      options: ['A4', 'A5', 'A6', 'DL (99x210mm)', '1/3 A4'],
    },
    {
      key: 'material',
      label: 'Paper Stock',
      type: 'select',
      required: true,
      options: ['130gsm Silk', '170gsm Silk', '250gsm Silk', '130gsm Gloss', '170gsm Gloss'],
    },
    {
      key: 'finish',
      label: 'Fold Type',
      type: 'select',
      required: false,
      options: ['Flat', 'Half Fold', 'Tri-Fold', 'Z-Fold', 'Gate Fold'],
    },
  ],
  GREETING_CARD: [
    {
      key: 'size',
      label: 'Size',
      type: 'select',
      required: true,
      options: ['A6 (105x148mm)', 'A5 (148x210mm)', 'Square (148x148mm)', '5x7 inch'],
    },
    {
      key: 'material',
      label: 'Card Stock',
      type: 'select',
      required: true,
      options: ['300gsm Silk', '350gsm Matt', '350gsm Textured', '400gsm Premium'],
    },
    {
      key: 'finish',
      label: 'Finish',
      type: 'select',
      required: false,
      options: ['None', 'Matt Lamination', 'Gloss Lamination', 'Spot UV'],
    },
  ],
  POSTCARD: [
    {
      key: 'size',
      label: 'Size',
      type: 'select',
      required: true,
      options: ['A6 (105x148mm)', 'A5 (148x210mm)', '6x4 inch', '5x7 inch'],
    },
    {
      key: 'material',
      label: 'Card Stock',
      type: 'select',
      required: true,
      options: ['300gsm Silk', '350gsm Silk', '400gsm Uncoated'],
    },
    {
      key: 'finish',
      label: 'Finish',
      type: 'select',
      required: false,
      options: ['None', 'Matt Lamination', 'Gloss Lamination'],
    },
  ],

  // Large Format
  BANNER: [
    {
      key: 'size',
      label: 'Size',
      type: 'select',
      required: true,
      options: ['2x1m', '3x1m', '4x1m', '2x0.5m', '3x0.5m', 'Custom'],
    },
    {
      key: 'material',
      label: 'Material',
      type: 'select',
      required: true,
      options: ['PVC Vinyl (440gsm)', 'Mesh Vinyl', 'Fabric', 'Canvas'],
    },
    {
      key: 'finish',
      label: 'Finishing',
      type: 'select',
      required: false,
      options: ['Eyelets', 'Pole Pockets', 'Hemmed Edges', 'None'],
    },
  ],
  POSTER: [
    {
      key: 'size',
      label: 'Size',
      type: 'select',
      required: true,
      options: ['A4', 'A3', 'A2', 'A1', 'A0', '50x70cm', '61x91cm'],
    },
    {
      key: 'material',
      label: 'Paper',
      type: 'select',
      required: true,
      options: ['170gsm Silk', '200gsm Silk', '250gsm Silk', '190gsm Photo Satin', '260gsm Photo Gloss'],
    },
    {
      key: 'finish',
      label: 'Finish',
      type: 'select',
      required: false,
      options: ['None', 'Matt Lamination', 'Gloss Lamination', 'Encapsulation'],
    },
  ],

  // Photo Prints
  CANVAS_PRINT: [
    {
      key: 'size',
      label: 'Size',
      type: 'select',
      required: true,
      options: ['20x20cm', '30x30cm', '40x30cm', '50x40cm', '60x40cm', '80x60cm', '100x75cm', 'Custom'],
    },
    {
      key: 'material',
      label: 'Canvas Type',
      type: 'select',
      required: true,
      options: ['Cotton Canvas', 'Polyester Canvas', 'Artist Grade'],
    },
    {
      key: 'finish',
      label: 'Frame Depth',
      type: 'select',
      required: false,
      options: ['18mm Standard', '38mm Gallery', '50mm Museum'],
    },
  ],
  ALUMINUM_PRINT: [
    {
      key: 'size',
      label: 'Size',
      type: 'select',
      required: true,
      options: ['20x30cm', '30x40cm', '40x60cm', '50x70cm', '60x90cm', 'Custom'],
    },
    {
      key: 'finish',
      label: 'Finish',
      type: 'select',
      required: true,
      options: ['Gloss', 'Matte', 'Brushed Silver', 'White'],
    },
  ],
  PHOTO_PAPER_PRINT: [
    {
      key: 'size',
      label: 'Size',
      type: 'select',
      required: true,
      options: ['6x4 inch', '7x5 inch', '8x6 inch', '10x8 inch', '12x8 inch', 'A4', 'A3'],
    },
    {
      key: 'material',
      label: 'Paper Type',
      type: 'select',
      required: true,
      options: ['Gloss', 'Lustre', 'Matte', 'Metallic', 'Fine Art'],
    },
  ],
  ACRYLIC_LED_PRINT: [
    {
      key: 'size',
      label: 'Size',
      type: 'select',
      required: true,
      options: ['20x15cm', '30x20cm', '40x30cm', '50x40cm'],
    },
    {
      key: 'finish',
      label: 'Acrylic Type',
      type: 'select',
      required: true,
      options: ['Clear Gloss', 'Frosted', 'Colored Edge'],
    },
  ],

  // Digital Products
  DIGITAL_PDF: [
    {
      key: 'size',
      label: 'Format',
      type: 'select',
      required: true,
      options: ['A4 PDF', 'Letter PDF', 'Square', 'Custom'],
    },
    {
      key: 'finish',
      label: 'Pages',
      type: 'select',
      required: false,
      options: ['Single Page', 'Multi-Page', 'Editable Template'],
    },
  ],
};

/**
 * Get variant properties for a product type
 */
export function getPropertiesForProductType(productType: ProductType): VariantPropertyConfig[] {
  return PRODUCT_TYPE_PROPERTIES[productType] || [];
}

/**
 * Get all available property keys across all product types
 */
export function getAllPropertyKeys(): string[] {
  const keys = new Set<string>();
  Object.values(PRODUCT_TYPE_PROPERTIES).forEach((props) => {
    props.forEach((p) => keys.add(p.key));
  });
  return Array.from(keys);
}

/**
 * Validate variant against product type requirements
 */
export function validateVariantProperties(
  productType: ProductType,
  variant: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const properties = getPropertiesForProductType(productType);
  const errors: string[] = [];

  for (const prop of properties) {
    const value = variant[prop.key];
    if (prop.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      errors.push(`${prop.label} is required`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate a variant name from its properties
 */
export function generateVariantName(
  productType: ProductType,
  variant: Record<string, string | undefined>
): string {
  const properties = getPropertiesForProductType(productType);
  const parts: string[] = [];

  for (const prop of properties) {
    const value = variant[prop.key];
    if (value) {
      parts.push(value);
    }
  }

  return parts.length > 0 ? parts.join(' / ') : 'Default';
}

/**
 * Generate a SKU from product slug and variant properties
 */
export function generateVariantSku(
  productSlug: string,
  variant: Record<string, string | undefined>
): string {
  const parts = [productSlug.toUpperCase().replace(/-/g, '')];

  if (variant.size) parts.push(variant.size.replace(/[^a-zA-Z0-9]/g, '').toUpperCase());
  if (variant.color) parts.push(variant.color.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase());
  if (variant.material) parts.push(variant.material.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase());

  return parts.join('-');
}
