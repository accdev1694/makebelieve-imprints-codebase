import apiClient from './client';

/**
 * Storage Service
 * Handles file uploads to backend storage (IONOS Object Storage / Local FS)
 */

export interface UploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
}

export interface FileMetadata {
  name: string;
  type: string;
  size: number;
}

export const storageService = {
  /**
   * Request a signed upload URL from the backend
   */
  async getUploadUrl(fileName: string, contentType: string): Promise<UploadUrlResponse> {
    const response = await apiClient.post<UploadUrlResponse>('/files/upload-url', {
      fileName,
      contentType,
    });
    return response.data;
  },

  /**
   * Upload file directly to storage using signed URL
   */
  async uploadFile(file: File): Promise<string> {
    // Step 1: Get signed upload URL from backend
    const { uploadUrl, publicUrl } = await this.getUploadUrl(file.name, file.type);

    // Step 2: Upload file directly to storage
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file to storage');
    }

    // Step 3: Return the public URL
    return publicUrl;
  },

  /**
   * Upload file with progress tracking
   */
  async uploadFileWithProgress(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    // Get signed upload URL
    const { uploadUrl, publicUrl } = await this.getUploadUrl(file.name, file.type);

    // Upload with progress tracking using XMLHttpRequest
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });
      }

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(publicUrl);
        } else {
          reject(new Error('Failed to upload file'));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      // Send request
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  },

  /**
   * Delete a file from storage
   */
  async deleteFile(fileKey: string): Promise<void> {
    await apiClient.delete(`/files/${encodeURIComponent(fileKey)}`);
  },

  /**
   * Get download URL for a file
   */
  async getDownloadUrl(fileKey: string): Promise<string> {
    const response = await apiClient.get<{ url: string }>(
      `/files/${encodeURIComponent(fileKey)}/download`
    );
    return response.data.url;
  },
};
