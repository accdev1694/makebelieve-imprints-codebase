/**
 * Mockup Template Configurations
 * Defines how user designs should be overlaid onto product templates
 */

export interface PrintArea {
  // Position as percentage of template image (0-100)
  x: number;
  y: number;
  // Size as percentage of template image (0-100)
  width: number;
  height: number;
  // Rotation in degrees
  rotation?: number;
  // Whether to apply perspective transform
  perspective?: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
  };
}

export interface MockupTemplate {
  id: string;
  name: string;
  productType: string;
  // Base template image URL
  templateUrl: string;
  // Thumbnail for selection
  thumbnailUrl: string;
  // Where the design should be placed
  printArea: PrintArea;
  // Background color for the product (if applicable)
  backgroundColor?: string;
  // Whether the design should be clipped to a shape
  clipShape?: 'rectangle' | 'circle' | 'rounded';
  clipRadius?: number;
}

// Product mockup templates organized by product type
export const MOCKUP_TEMPLATES: Record<string, MockupTemplate[]> = {
  MUG: [
    {
      id: 'mug-white-front',
      name: 'White Mug - Front View',
      productType: 'MUG',
      templateUrl: '/mockups/mug-white-template.png',
      thumbnailUrl: '/mockups/mug-white-thumb.png',
      printArea: {
        x: 25,
        y: 20,
        width: 50,
        height: 60,
      },
      clipShape: 'rounded',
      clipRadius: 2,
    },
  ],
  TSHIRT: [
    {
      id: 'tshirt-white-front',
      name: 'White T-Shirt - Front',
      productType: 'TSHIRT',
      templateUrl: '/mockups/tshirt-white-template.png',
      thumbnailUrl: '/mockups/tshirt-white-thumb.png',
      printArea: {
        x: 30,
        y: 25,
        width: 40,
        height: 35,
      },
    },
  ],
  CUSHION_PILLOW: [
    {
      id: 'cushion-white-front',
      name: 'White Cushion - Front',
      productType: 'CUSHION_PILLOW',
      templateUrl: '/mockups/cushion-white-template.png',
      thumbnailUrl: '/mockups/cushion-white-thumb.png',
      printArea: {
        x: 15,
        y: 15,
        width: 70,
        height: 70,
      },
    },
  ],
  MOUSEMAT: [
    {
      id: 'mousemat-rectangle',
      name: 'Rectangle Mousemat',
      productType: 'MOUSEMAT',
      templateUrl: '/mockups/mousemat-template.png',
      thumbnailUrl: '/mockups/mousemat-thumb.png',
      printArea: {
        x: 10,
        y: 10,
        width: 80,
        height: 80,
      },
      clipShape: 'rounded',
      clipRadius: 5,
    },
  ],
  CANVAS_PRINT: [
    {
      id: 'canvas-wall-mock',
      name: 'Canvas on Wall',
      productType: 'CANVAS_PRINT',
      templateUrl: '/mockups/canvas-wall-template.png',
      thumbnailUrl: '/mockups/canvas-wall-thumb.png',
      printArea: {
        x: 20,
        y: 15,
        width: 60,
        height: 70,
      },
    },
  ],
  POSTER: [
    {
      id: 'poster-frame-mock',
      name: 'Framed Poster',
      productType: 'POSTER',
      templateUrl: '/mockups/poster-frame-template.png',
      thumbnailUrl: '/mockups/poster-frame-thumb.png',
      printArea: {
        x: 15,
        y: 10,
        width: 70,
        height: 80,
      },
    },
  ],
  KEYCHAIN: [
    {
      id: 'keychain-round',
      name: 'Round Keychain',
      productType: 'KEYCHAIN',
      templateUrl: '/mockups/keychain-round-template.png',
      thumbnailUrl: '/mockups/keychain-round-thumb.png',
      printArea: {
        x: 25,
        y: 20,
        width: 50,
        height: 50,
      },
      clipShape: 'circle',
    },
  ],
  WATER_BOTTLE: [
    {
      id: 'bottle-white-front',
      name: 'White Water Bottle',
      productType: 'WATER_BOTTLE',
      templateUrl: '/mockups/bottle-white-template.png',
      thumbnailUrl: '/mockups/bottle-white-thumb.png',
      printArea: {
        x: 30,
        y: 25,
        width: 40,
        height: 50,
      },
    },
  ],
  BUSINESS_CARD: [
    {
      id: 'business-card-stack',
      name: 'Business Card Stack',
      productType: 'BUSINESS_CARD',
      templateUrl: '/mockups/business-card-template.png',
      thumbnailUrl: '/mockups/business-card-thumb.png',
      printArea: {
        x: 10,
        y: 15,
        width: 80,
        height: 55,
      },
    },
  ],
  GREETING_CARD: [
    {
      id: 'greeting-card-standing',
      name: 'Standing Greeting Card',
      productType: 'GREETING_CARD',
      templateUrl: '/mockups/greeting-card-template.png',
      thumbnailUrl: '/mockups/greeting-card-thumb.png',
      printArea: {
        x: 20,
        y: 10,
        width: 60,
        height: 80,
      },
    },
  ],
};

// Default generic mockup for products without specific templates
export const DEFAULT_MOCKUP_TEMPLATE: MockupTemplate = {
  id: 'generic-frame',
  name: 'Generic Preview',
  productType: 'GENERIC',
  templateUrl: '/mockups/generic-frame-template.png',
  thumbnailUrl: '/mockups/generic-frame-thumb.png',
  printArea: {
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  },
};

/**
 * Get mockup templates for a product type
 */
export function getMockupTemplates(productType: string): MockupTemplate[] {
  return MOCKUP_TEMPLATES[productType] || [DEFAULT_MOCKUP_TEMPLATE];
}

/**
 * Get the first/default mockup template for a product type
 */
export function getDefaultMockupTemplate(productType: string): MockupTemplate {
  const templates = MOCKUP_TEMPLATES[productType];
  return templates?.[0] || DEFAULT_MOCKUP_TEMPLATE;
}

/**
 * Simple placeholder colors for mockup backgrounds when templates aren't available
 */
export const MOCKUP_PLACEHOLDER_COLORS: Record<string, string> = {
  MUG: '#FFFFFF',
  TSHIRT: '#F5F5F5',
  CUSHION_PILLOW: '#FAFAFA',
  MOUSEMAT: '#2D2D2D',
  CANVAS_PRINT: '#FFFFFF',
  POSTER: '#FFFFFF',
  KEYCHAIN: '#E0E0E0',
  WATER_BOTTLE: '#FFFFFF',
  BUSINESS_CARD: '#FFFFFF',
  GREETING_CARD: '#FFFEF0',
};
