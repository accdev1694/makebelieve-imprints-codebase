/**
 * Local File Storage Service
 * For development and testing - stores files on local filesystem
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  IFileStorageService,
  FileMetadata,
  UploadResult,
  SignedUrlResult,
  DeleteResult,
  DownloadResult,
} from '../types/storage.types';

export class LocalStorageService implements IFileStorageService {
  private baseDir: string;
  private baseUrl: string;

  constructor() {
    this.baseDir = process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), 'uploads');
    this.baseUrl = process.env.LOCAL_STORAGE_URL || 'http://localhost:4000/uploads';

    // Create base directory if it doesn't exist
    this.ensureBaseDir();
  }

  private async ensureBaseDir(): Promise<void> {
    try {
      await fs.access(this.baseDir);
    } catch {
      await fs.mkdir(this.baseDir, { recursive: true });
      console.log(`Created local storage directory: ${this.baseDir}`);
    }
  }

  /**
   * Generate signed upload URL
   * For local storage, this is a simple POST endpoint
   */
  async generateSignedUploadUrl(
    metadata: FileMetadata,
    expiresIn: number = 3600
  ): Promise<SignedUrlResult> {
    try {
      // For local storage, signed URLs are just direct upload endpoints
      // with a temporary token
      const token = Buffer.from(
        JSON.stringify({
          filename: metadata.filename,
          expiresAt: Date.now() + expiresIn * 1000,
        })
      ).toString('base64url');

      const uploadUrl = `${this.baseUrl}/upload?token=${token}`;
      const fileUrl = `${this.baseUrl}/${metadata.filename}`;

      return {
        success: true,
        uploadUrl,
        fileUrl,
        fileKey: metadata.filename,
        expiresIn,
      };
    } catch (error) {
      console.error('Failed to generate signed upload URL:', error);
      return {
        success: false,
        uploadUrl: '',
        fileUrl: '',
        fileKey: metadata.filename,
        expiresIn: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate signed download URL
   */
  async generateSignedDownloadUrl(
    fileKey: string,
    expiresIn: number = 3600
  ): Promise<SignedUrlResult> {
    try {
      const token = Buffer.from(
        JSON.stringify({
          filename: fileKey,
          expiresAt: Date.now() + expiresIn * 1000,
        })
      ).toString('base64url');

      const downloadUrl = `${this.baseUrl}/${fileKey}?token=${token}`;

      return {
        success: true,
        uploadUrl: downloadUrl,
        fileUrl: downloadUrl,
        fileKey,
        expiresIn,
      };
    } catch (error) {
      console.error('Failed to generate signed download URL:', error);
      return {
        success: false,
        uploadUrl: '',
        fileUrl: '',
        fileKey,
        expiresIn: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Upload file to local filesystem
   */
  async uploadFile(
    fileKey: string,
    data: Buffer,
    metadata: FileMetadata
  ): Promise<UploadResult> {
    try {
      await this.ensureBaseDir();

      const filePath = path.join(this.baseDir, fileKey);
      const fileDir = path.dirname(filePath);

      // Create directory structure if needed
      await fs.mkdir(fileDir, { recursive: true });

      // Write file
      await fs.writeFile(filePath, data);

      // Write metadata as separate JSON file
      const metadataPath = `${filePath}.meta.json`;
      await fs.writeFile(
        metadataPath,
        JSON.stringify({
          ...metadata,
          uploadedAt: new Date().toISOString(),
        })
      );

      const fileUrl = `${this.baseUrl}/${fileKey}`;

      console.log(`[LOCAL] Uploaded file: ${fileKey}`);

      return {
        success: true,
        fileUrl,
        fileKey,
      };
    } catch (error) {
      console.error('Failed to upload file:', error);
      return {
        success: false,
        fileUrl: '',
        fileKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Download file from local filesystem
   */
  async downloadFile(fileKey: string): Promise<DownloadResult> {
    try {
      const filePath = path.join(this.baseDir, fileKey);
      const data = await fs.readFile(filePath);

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Failed to download file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete file from local filesystem
   */
  async deleteFile(fileKey: string): Promise<DeleteResult> {
    try {
      const filePath = path.join(this.baseDir, fileKey);
      const metadataPath = `${filePath}.meta.json`;

      // Delete both file and metadata
      await fs.unlink(filePath);
      try {
        await fs.unlink(metadataPath);
      } catch {
        // Metadata file might not exist
      }

      console.log(`[LOCAL] Deleted file: ${fileKey}`);

      return {
        success: true,
        fileKey,
      };
    } catch (error) {
      console.error('Failed to delete file:', error);
      return {
        success: false,
        fileKey,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(fileKey: string): Promise<boolean> {
    try {
      const filePath = path.join(this.baseDir, fileKey);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file URL
   */
  async getFileUrl(fileKey: string, _isPublic: boolean = false): Promise<string> {
    // In local storage, all files are accessible via the same base URL
    return `${this.baseUrl}/${fileKey}`;
  }
}
