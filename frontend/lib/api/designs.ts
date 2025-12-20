import apiClient from './client';

export type PrintSize = 'A4' | 'A5' | 'A6' | 'SQUARE_10x10' | 'SQUARE_15x15' | 'CUSTOM';
export type Material = 'GLOSSY_PAPER' | 'MATTE_PAPER' | 'CANVAS' | 'METAL' | 'WOOD' | 'ACRYLIC';
export type Orientation = 'PORTRAIT' | 'LANDSCAPE' | 'SQUARE';

export interface Design {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  printSize: PrintSize;
  material: Material;
  orientation: Orientation;
  customWidth?: number;
  customHeight?: number;
  previewUrl?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDesignData {
  name: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  printSize: PrintSize;
  material: Material;
  orientation: Orientation;
  customWidth?: number;
  customHeight?: number;
}

export interface UpdateDesignData {
  name?: string;
  description?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  printSize?: PrintSize;
  material?: Material;
  orientation?: Orientation;
  customWidth?: number;
  customHeight?: number;
}

/**
 * Designs Service
 * Handles all design-related API calls
 */
export const designsService = {
  /**
   * Create a new design
   */
  async create(data: CreateDesignData): Promise<Design> {
    const response = await apiClient.post<{ design: Design }>('/designs', data);
    return response.data.design;
  },

  /**
   * Get all designs for current user
   */
  async list(): Promise<Design[]> {
    const response = await apiClient.get<{ designs: Design[] }>('/designs');
    return response.data.designs;
  },

  /**
   * Get a specific design by ID
   */
  async get(id: string): Promise<Design> {
    const response = await apiClient.get<{ design: Design }>(`/designs/${id}`);
    return response.data.design;
  },

  /**
   * Update a design
   */
  async update(id: string, data: UpdateDesignData): Promise<Design> {
    const response = await apiClient.put<{ design: Design }>(`/designs/${id}`, data);
    return response.data.design;
  },

  /**
   * Delete a design
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/designs/${id}`);
  },
};

/**
 * Material labels for UI display
 */
export const MATERIAL_LABELS: Record<Material, string> = {
  GLOSSY_PAPER: 'Glossy Paper',
  MATTE_PAPER: 'Matte Paper',
  CANVAS: 'Canvas',
  METAL: 'Metal Print',
  WOOD: 'Wood Print',
  ACRYLIC: 'Acrylic Glass',
};

/**
 * Print size labels for UI display
 */
export const PRINT_SIZE_LABELS: Record<PrintSize, string> = {
  A4: 'A4 (21 × 29.7 cm)',
  A5: 'A5 (14.8 × 21 cm)',
  A6: 'A6 (10.5 × 14.8 cm)',
  SQUARE_10x10: 'Square 10×10 cm',
  SQUARE_15x15: 'Square 15×15 cm',
  CUSTOM: 'Custom Size',
};

/**
 * Orientation labels for UI display
 */
export const ORIENTATION_LABELS: Record<Orientation, string> = {
  PORTRAIT: 'Portrait',
  LANDSCAPE: 'Landscape',
  SQUARE: 'Square',
};
