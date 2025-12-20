/**
 * File Storage Service Factory
 *
 * Returns the appropriate storage service based on environment:
 * - Local storage for development (USE_LOCAL_STORAGE=true or missing S3 credentials)
 * - S3-compatible storage for production (IONOS Object Storage, AWS S3, etc.)
 *
 * Environment variables:
 * - USE_LOCAL_STORAGE: Set to 'true' to force local storage
 * - S3_BUCKET: S3 bucket name (required for S3)
 * - S3_REGION: S3 region (default: eu-central-1)
 * - S3_ENDPOINT: S3 endpoint URL (for IONOS: https://s3.ionos.com)
 * - S3_ACCESS_KEY_ID: S3 access key
 * - S3_SECRET_ACCESS_KEY: S3 secret key
 * - LOCAL_STORAGE_DIR: Local directory for file storage (default: ./uploads)
 * - LOCAL_STORAGE_URL: Base URL for accessing local files (default: http://localhost:4000/uploads)
 */

import { IFileStorageService } from '../types/storage.types';
import { LocalStorageService } from './storage-local.service';
import { S3StorageService } from './storage-s3.service';

/**
 * Create and configure the appropriate storage service
 */
export function createStorageService(): IFileStorageService {
  const useLocalStorage = process.env.USE_LOCAL_STORAGE === 'true';
  const hasS3Credentials =
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET;

  // Use local storage if explicitly requested or if S3 credentials are missing
  if (useLocalStorage || !hasS3Credentials) {
    if (!useLocalStorage && !hasS3Credentials) {
      console.warn(
        'S3 credentials not found. Using local file storage. Set S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY to use S3-compatible storage.'
      );
    } else {
      console.info('Using local file storage (development mode)');
    }
    return new LocalStorageService();
  }

  console.info(
    `Using S3-compatible storage (bucket: ${process.env.S3_BUCKET}, endpoint: ${process.env.S3_ENDPOINT || 'AWS S3'})`
  );
  return new S3StorageService();
}

/**
 * Singleton instance of the storage service
 * Use this throughout the application
 */
export const storageService = createStorageService();
