import apiClient from './client';
import {
  PrintSize,
  Material,
  Orientation,
  Design as SharedDesign,
  CreateDesignData as SharedCreateDesignData,
  UpdateDesignData as SharedUpdateDesignData,
  MATERIAL_LABELS as SHARED_MATERIAL_LABELS,
} from '@mkbl/shared';

// Re-export shared types for convenience
export type { PrintSize, Material, Orientation };

// Extend shared Design type with frontend-specific fields
export interface Design extends Omit<SharedDesign, 'printSize' | 'material' | 'orientation'> {
  printSize: PrintSize;
  material: Material;
  orientation: Orientation;
  updatedAt: string;
}

// Re-export shared types
export type CreateDesignData = SharedCreateDesignData;
export type UpdateDesignData = SharedUpdateDesignData;

/**
 * Designs Service
 * Handles all design-related API calls
 */
export const designsService = {
  /**
   * Create a new design
   */
  async create(data: CreateDesignData): Promise<Design> {
    const response = await apiClient.post<{ data: { design: Design } }>('/designs', data);
    return response.data.data.design;
  },

  /**
   * Get all designs for current user
   */
  async list(): Promise<Design[]> {
    const response = await apiClient.get<{ data: { designs: Design[] } }>('/designs');
    return response.data.data.designs;
  },

  /**
   * Get a specific design by ID
   */
  async get(id: string): Promise<Design> {
    const response = await apiClient.get<{ data: { design: Design } }>(`/designs/${id}`);
    return response.data.data.design;
  },

  /**
   * Update a design
   */
  async update(id: string, data: UpdateDesignData): Promise<Design> {
    const response = await apiClient.put<{ data: { design: Design } }>(`/designs/${id}`, data);
    return response.data.data.design;
  },

  /**
   * Delete a design
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/designs/${id}`);
  },
};

/**
 * Material labels for UI display (extended from shared)
 */
export const MATERIAL_LABELS: Record<Material, string> = {
  ...SHARED_MATERIAL_LABELS,
  MATTE: 'Matte Paper',
  GLOSSY: 'Glossy Paper',
  FINE_ART: 'Fine Art Print',
};

/**
 * Print size labels for UI display
 */
export const PRINT_SIZE_LABELS: Record<PrintSize, string> = {
  A4: 'A4 (21 × 29.7 cm)',
  A3: 'A3 (29.7 × 42 cm)',
  A5: 'A5 (14.8 × 21 cm)',
  SQUARE_20CM: 'Square 20×20 cm',
  SQUARE_30CM: 'Square 30×30 cm',
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
