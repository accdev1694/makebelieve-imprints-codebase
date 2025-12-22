/**
 * Template definitions for design customization
 * These templates provide starting points for users who don't want to upload their own designs
 */

import { Material, PrintSize } from './api/designs';

export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'birthday' | 'wedding' | 'anniversary' | 'graduation' | 'baby' | 'holiday' | 'general';
  previewUrl: string;
  thumbnailUrl: string;
  recommendedSize: PrintSize;
  recommendedMaterial: Material;
}

/**
 * Available templates
 * In production, these would come from the backend/CMS
 */
export const templates: Template[] = [
  {
    id: 'birthday-1',
    name: 'Happy Birthday Celebration',
    description: 'Colorful birthday design with balloons and confetti',
    category: 'birthday',
    previewUrl: '/templates/birthday-1.png',
    thumbnailUrl: '/templates/thumbs/birthday-1.png',
    recommendedSize: 'A4',
    recommendedMaterial: 'GLOSSY_PAPER',
  },
  {
    id: 'birthday-2',
    name: 'Elegant Birthday',
    description: 'Sophisticated birthday design with gold accents',
    category: 'birthday',
    previewUrl: '/templates/birthday-2.png',
    thumbnailUrl: '/templates/thumbs/birthday-2.png',
    recommendedSize: 'A5',
    recommendedMaterial: 'MATTE_PAPER',
  },
  {
    id: 'wedding-1',
    name: 'Classic Wedding',
    description: 'Timeless wedding design with elegant typography',
    category: 'wedding',
    previewUrl: '/templates/wedding-1.png',
    thumbnailUrl: '/templates/thumbs/wedding-1.png',
    recommendedSize: 'A4',
    recommendedMaterial: 'MATTE_PAPER',
  },
  {
    id: 'wedding-2',
    name: 'Romantic Wedding',
    description: 'Romantic wedding design with floral elements',
    category: 'wedding',
    previewUrl: '/templates/wedding-2.png',
    thumbnailUrl: '/templates/thumbs/wedding-2.png',
    recommendedSize: 'A4',
    recommendedMaterial: 'GLOSSY_PAPER',
  },
  {
    id: 'anniversary-1',
    name: 'Anniversary Love',
    description: 'Heartfelt anniversary design with hearts and flowers',
    category: 'anniversary',
    previewUrl: '/templates/anniversary-1.png',
    thumbnailUrl: '/templates/thumbs/anniversary-1.png',
    recommendedSize: 'A5',
    recommendedMaterial: 'GLOSSY_PAPER',
  },
  {
    id: 'baby-1',
    name: 'Baby Announcement',
    description: 'Cute baby announcement design with pastel colors',
    category: 'baby',
    previewUrl: '/templates/baby-1.png',
    thumbnailUrl: '/templates/thumbs/baby-1.png',
    recommendedSize: 'A4',
    recommendedMaterial: 'MATTE_PAPER',
  },
  {
    id: 'graduation-1',
    name: 'Graduation Celebration',
    description: 'Proud graduation design with cap and diploma',
    category: 'graduation',
    previewUrl: '/templates/graduation-1.png',
    thumbnailUrl: '/templates/thumbs/graduation-1.png',
    recommendedSize: 'A4',
    recommendedMaterial: 'GLOSSY_PAPER',
  },
  {
    id: 'holiday-1',
    name: 'Holiday Cheer',
    description: 'Festive holiday design with seasonal elements',
    category: 'holiday',
    previewUrl: '/templates/holiday-1.png',
    thumbnailUrl: '/templates/thumbs/holiday-1.png',
    recommendedSize: 'A5',
    recommendedMaterial: 'GLOSSY_PAPER',
  },
  {
    id: 'general-1',
    name: 'Thank You Card',
    description: 'Simple and elegant thank you card design',
    category: 'general',
    previewUrl: '/templates/general-1.png',
    thumbnailUrl: '/templates/thumbs/general-1.png',
    recommendedSize: 'A6',
    recommendedMaterial: 'MATTE_PAPER',
  },
  {
    id: 'general-2',
    name: 'Photo Collage',
    description: 'Modern photo collage template with multiple frames',
    category: 'general',
    previewUrl: '/templates/general-2.png',
    thumbnailUrl: '/templates/thumbs/general-2.png',
    recommendedSize: 'A4',
    recommendedMaterial: 'GLOSSY_PAPER',
  },
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: Template['category']): Template[] {
  return templates.filter((t) => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}

/**
 * Get all template categories
 */
export function getCategories(): Template['category'][] {
  return ['birthday', 'wedding', 'anniversary', 'graduation', 'baby', 'holiday', 'general'];
}

/**
 * Get category display name
 */
export function getCategoryName(category: Template['category']): string {
  const names: Record<Template['category'], string> = {
    birthday: 'Birthday',
    wedding: 'Wedding',
    anniversary: 'Anniversary',
    graduation: 'Graduation',
    baby: 'Baby & Kids',
    holiday: 'Holidays',
    general: 'General',
  };
  return names[category];
}
