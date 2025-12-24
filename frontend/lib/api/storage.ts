/* eslint-disable @typescript-eslint/no-explicit-any, no-console */
import apiClient from './client';

/**
 * Storage Service
 * Handles file uploads via a server-side proxy to avoid CORS issues.
 */
export const storageService = {
  /**
   * Upload file directly to our backend, which then streams it to storage.
   */
  async uploadFile(file: File): Promise<string> {
    try {
      const response = await apiClient.put<{ data: { fileUrl: string } }>(
        `/uploads/proxy?filename=${encodeURIComponent(file.name)}`,
        file,
        {
          headers: {
            'Content-Type': file.type,
          },
        }
      );
      return response.data.data.fileUrl;
    } catch (error: any) {
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

