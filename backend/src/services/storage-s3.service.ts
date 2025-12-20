/**
 * S3-Compatible Storage Service
 * Works with IONOS Object Storage, AWS S3, MinIO, and other S3-compatible services
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  IFileStorageService,
  FileMetadata,
  UploadResult,
  SignedUrlResult,
  DeleteResult,
  DownloadResult,
  StorageConfig,
} from '../types/storage.types';

export class S3StorageService implements IFileStorageService {
  private client: S3Client;
  private config: StorageConfig;

  constructor(config?: Partial<StorageConfig>) {
    this.config = {
      bucket: process.env.S3_BUCKET || 'mkbl-uploads',
      region: process.env.S3_REGION || 'eu-central-1',
      endpoint: process.env.S3_ENDPOINT, // IONOS endpoint
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      maxFileSize: 50 * 1024 * 1024, // 50MB default
      ...config,
    };

    // Initialize S3 client
    this.client = new S3Client({
      region: this.config.region!,
      endpoint: this.config.endpoint,
      credentials: this.config.accessKeyId && this.config.secretAccessKey
        ? {
            accessKeyId: this.config.accessKeyId,
            secretAccessKey: this.config.secretAccessKey,
          }
        : undefined,
      // Force path style for IONOS compatibility
      forcePathStyle: !!this.config.endpoint,
    });

    // Validate configuration
    if (!this.config.accessKeyId || !this.config.secretAccessKey) {
      console.warn(
        'S3 credentials not configured. Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY environment variables.'
      );
    }
  }

  /**
   * Generate signed URL for client-side upload
   */
  async generateSignedUploadUrl(
    metadata: FileMetadata,
    expiresIn: number = 3600 // 1 hour default
  ): Promise<SignedUrlResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: metadata.filename,
        ContentType: metadata.mimeType,
        Metadata: {
          userId: metadata.userId || '',
          designId: metadata.designId || '',
          originalSize: metadata.size.toString(),
        },
      });

      const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });

      const fileUrl = this.config.endpoint
        ? `${this.config.endpoint}/${this.config.bucket}/${metadata.filename}`
        : `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${metadata.filename}`;

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
   * Generate signed URL for downloading private files
   */
  async generateSignedDownloadUrl(
    fileKey: string,
    expiresIn: number = 3600
  ): Promise<SignedUrlResult> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: fileKey,
      });

      const downloadUrl = await getSignedUrl(this.client, command, { expiresIn });

      return {
        success: true,
        uploadUrl: downloadUrl, // Using uploadUrl field for download URL
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
   * Upload file directly from server
   */
  async uploadFile(
    fileKey: string,
    data: Buffer,
    metadata: FileMetadata
  ): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: fileKey,
        Body: data,
        ContentType: metadata.mimeType,
        Metadata: {
          userId: metadata.userId || '',
          designId: metadata.designId || '',
          originalSize: metadata.size.toString(),
        },
        ACL: metadata.isPublic ? 'public-read' : 'private',
      });

      await this.client.send(command);

      const fileUrl = await this.getFileUrl(fileKey, metadata.isPublic);

      return {
        success: true,
        fileUrl,
        fileKey,
        bucket: this.config.bucket,
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
   * Download file from storage
   */
  async downloadFile(fileKey: string): Promise<DownloadResult> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: fileKey,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        return {
          success: false,
          error: 'No file data received',
        };
      }

      const data = await response.Body.transformToByteArray();

      return {
        success: true,
        data: Buffer.from(data),
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
   * Delete file from storage
   */
  async deleteFile(fileKey: string): Promise<DeleteResult> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: fileKey,
      });

      await this.client.send(command);

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
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: fileKey,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file URL
   */
  async getFileUrl(fileKey: string, isPublic: boolean = false): Promise<string> {
    if (isPublic) {
      // Public URL (direct access)
      if (this.config.endpoint) {
        return `${this.config.endpoint}/${this.config.bucket}/${fileKey}`;
      }
      return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${fileKey}`;
    }

    // Private file - generate signed URL (1 hour expiry)
    const result = await this.generateSignedDownloadUrl(fileKey, 3600);
    return result.fileUrl;
  }
}
