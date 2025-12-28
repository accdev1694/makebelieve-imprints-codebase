/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import apiClient from './client';

// Max file size for Vercel serverless (4MB to be safe under 4.5MB limit)
const MAX_FILE_SIZE = 4 * 1024 * 1024;

/**
 * Compress an image file to reduce size
 */
async function compressImage(file: File, maxSizeMB: number = 4): Promise<File> {
  // If it's not an image or already small enough, return as-is
  if (!file.type.startsWith('image/') || file.size <= maxSizeMB * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Calculate new dimensions (max 1920px on longest side)
      let { width, height } = img;
      const maxDimension = 1920;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;

      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Try different quality levels to get under max size
      const tryCompress = (quality: number): void => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            if (blob.size <= maxSizeMB * 1024 * 1024 || quality <= 0.3) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              console.log(`Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
              resolve(compressedFile);
            } else {
              // Try lower quality
              tryCompress(quality - 0.1);
            }
          },
          'image/jpeg',
          quality
        );
      };

      tryCompress(0.8);
    };

    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Storage Service
 * Handles file uploads via a server-side proxy to avoid CORS issues.
 */
export const storageService = {
  /**
   * Upload file directly to our backend, which then streams it to storage.
   * Automatically compresses images if needed.
   */
  async uploadFile(file: File): Promise<string> {
    try {
      // Compress image if needed
      const fileToUpload = await compressImage(file, 4);

      // Check if still too large
      if (fileToUpload.size > MAX_FILE_SIZE) {
        throw new Error(`File is too large (${(fileToUpload.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 4MB. Please use a smaller image.`);
      }

      const response = await apiClient.put<{ data: { fileUrl: string } }>(
        `/uploads/proxy?filename=${encodeURIComponent(file.name)}`,
        fileToUpload,
        {
          headers: {
            'Content-Type': fileToUpload.type,
          },
        }
      );
      return response.data.data.fileUrl;
    } catch (error: any) {
      // Check for 413 Payload Too Large
      if (error?.statusCode === 413 || error?.response?.status === 413) {
        throw new Error('File is too large. Please use a smaller image (max 4MB).');
      }
      // Log detailed error information
      console.error('File upload failed:', {
        message: error?.message,
        statusCode: error?.statusCode,
        error: error?.error,
        data: error?.data,
        fullError: error,
      });
      // Re-throw the error to be handled by the calling component
      throw error;
    }
  },

  /**
   * Upload file with progress tracking using the server-side proxy.
   */
  async uploadFileWithProgress(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const response = await apiClient.put<{ data: { fileUrl: string } }>(
      `/uploads/proxy?filename=${encodeURIComponent(file.name)}`,
      file,
      {
        headers: {
          'Content-Type': file.type,
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress?.(percentCompleted);
          }
        },
      }
    );
    return response.data.data.fileUrl;
  },

  /**
   * Delete a file from storage
   */
  async deleteFile(fileKey: string): Promise<void> {
    await apiClient.delete(`/uploads/${encodeURIComponent(fileKey)}`);
  },

  /**
   * Get download URL for a file
   */
  async getDownloadUrl(fileKey: string): Promise<string> {
    const response = await apiClient.post<{ data: { downloadUrl: string } }>(
      `/uploads/request-download-url`,
      { fileKey }
    );
    return response.data.data.downloadUrl;
  },
};

