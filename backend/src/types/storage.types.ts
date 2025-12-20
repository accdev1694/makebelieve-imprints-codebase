/**
 * File Storage Service Types
 * Supports S3-compatible storage (IONOS Object Storage) and local filesystem
 */

/**
 * File metadata for uploads
 */
export interface FileMetadata {
  filename: string;
  mimeType: string;
  size: number;
  userId?: string;
  designId?: string;
  isPublic?: boolean;
}

/**
 * Upload result
 */
export interface UploadResult {
  success: boolean;
  fileUrl: string;
  fileKey: string;
  bucket?: string;
  error?: string;
}

/**
 * Signed URL for secure uploads
 */
export interface SignedUrlResult {
  success: boolean;
  uploadUrl: string;
  fileUrl: string;
  fileKey: string;
  expiresIn: number; // seconds
  error?: string;
}

/**
 * File deletion result
 */
export interface DeleteResult {
  success: boolean;
  fileKey: string;
  error?: string;
}

/**
 * File download result
 */
export interface DownloadResult {
  success: boolean;
  data?: Buffer;
  error?: string;
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  bucket: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  maxFileSize?: number; // in bytes
  allowedMimeTypes?: string[];
}

/**
 * File Storage Service Interface
 */
export interface IFileStorageService {
  /**
   * Generate a signed URL for direct upload to storage
   * Client can upload directly to this URL
   */
  generateSignedUploadUrl(
    metadata: FileMetadata,
    expiresIn?: number
  ): Promise<SignedUrlResult>;

  /**
   * Generate a signed URL for downloading a file
   * Useful for private files
   */
  generateSignedDownloadUrl(
    fileKey: string,
    expiresIn?: number
  ): Promise<SignedUrlResult>;

  /**
   * Upload a file directly from the server
   * Use this when file is already on the server
   */
  uploadFile(
    fileKey: string,
    data: Buffer,
    metadata: FileMetadata
  ): Promise<UploadResult>;

  /**
   * Download a file to the server
   */
  downloadFile(fileKey: string): Promise<DownloadResult>;

  /**
   * Delete a file from storage
   */
  deleteFile(fileKey: string): Promise<DeleteResult>;

  /**
   * Check if a file exists
   */
  fileExists(fileKey: string): Promise<boolean>;

  /**
   * Get file URL (public or signed)
   */
  getFileUrl(fileKey: string, isPublic?: boolean): Promise<string>;
}

/**
 * Allowed file types for uploads
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',
];

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  ...ALLOWED_IMAGE_TYPES,
];

/**
 * File size limits (in bytes)
 */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Generate a unique file key for storage
 */
export function generateFileKey(
  userId: string,
  filename: string,
  prefix: string = 'uploads'
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${prefix}/${userId}/${timestamp}-${random}-${sanitizedFilename}`;
}
