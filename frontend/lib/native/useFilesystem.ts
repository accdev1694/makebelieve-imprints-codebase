/**
 * Filesystem Hook
 *
 * Provides local file storage functionality for design caching.
 * Uses device storage on native platforms, falls back to IndexedDB on web.
 */

'use client';

import { useState, useCallback } from 'react';
import { Filesystem, Directory, Encoding, WriteFileResult, ReadFileResult } from '@capacitor/filesystem';
import { isNativePlatform, isPluginAvailable } from './platform';

export interface FileInfo {
  name: string;
  path: string;
  size?: number;
  modifiedTime?: number;
}

export interface UseFilesystemResult {
  isLoading: boolean;
  error: string | null;
  saveFile: (filename: string, data: string, isBase64?: boolean) => Promise<string | null>;
  readFile: (filename: string, isBase64?: boolean) => Promise<string | null>;
  deleteFile: (filename: string) => Promise<boolean>;
  listFiles: (directory?: string) => Promise<FileInfo[]>;
  fileExists: (filename: string) => Promise<boolean>;
  clearCache: () => Promise<boolean>;
  isAvailable: boolean;
}

// Cache directory for design files
const CACHE_DIR = 'designs';

/**
 * Hook for filesystem operations
 *
 * @example
 * ```tsx
 * const { saveFile, readFile, listFiles } = useFilesystem();
 *
 * // Save a design to cache
 * const handleSaveDesign = async (designId: string, imageData: string) => {
 *   const path = await saveFile(`${designId}.png`, imageData, true);
 *   console.log('Saved to:', path);
 * };
 *
 * // Read a cached design
 * const handleLoadDesign = async (designId: string) => {
 *   const data = await readFile(`${designId}.png`, true);
 *   if (data) {
 *     // Use the cached image
 *   }
 * };
 * ```
 */
export function useFilesystem(): UseFilesystemResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAvailable = isNativePlatform() && isPluginAvailable('Filesystem');

  // Ensure the cache directory exists
  const ensureCacheDir = async (): Promise<void> => {
    try {
      await Filesystem.mkdir({
        path: CACHE_DIR,
        directory: Directory.Cache,
        recursive: true,
      });
    } catch (err) {
      // Directory might already exist, that's okay
      const message = err instanceof Error ? err.message : '';
      if (!message.includes('exists')) {
        throw err;
      }
    }
  };

  const saveFile = useCallback(async (
    filename: string,
    data: string,
    isBase64: boolean = false
  ): Promise<string | null> => {
    if (!isAvailable) {
      // Fallback: Use localStorage for web
      try {
        localStorage.setItem(`design_cache_${filename}`, data);
        return filename;
      } catch {
        setError('Failed to save to local storage');
        return null;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      await ensureCacheDir();

      const result: WriteFileResult = await Filesystem.writeFile({
        path: `${CACHE_DIR}/${filename}`,
        data: data,
        directory: Directory.Cache,
        encoding: isBase64 ? undefined : Encoding.UTF8,
      });

      return result.uri;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save file';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  const readFile = useCallback(async (
    filename: string,
    isBase64: boolean = false
  ): Promise<string | null> => {
    if (!isAvailable) {
      // Fallback: Use localStorage for web
      try {
        return localStorage.getItem(`design_cache_${filename}`);
      } catch {
        return null;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const result: ReadFileResult = await Filesystem.readFile({
        path: `${CACHE_DIR}/${filename}`,
        directory: Directory.Cache,
        encoding: isBase64 ? undefined : Encoding.UTF8,
      });

      // Handle both string and Blob results
      if (typeof result.data === 'string') {
        return result.data;
      } else {
        // Convert Blob to base64
        const reader = new FileReader();
        return new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(result.data as Blob);
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read file';
      // Don't set error for "file not found" - that's expected
      if (!message.includes('not exist') && !message.includes('not found')) {
        setError(message);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  const deleteFile = useCallback(async (filename: string): Promise<boolean> => {
    if (!isAvailable) {
      // Fallback: Use localStorage for web
      try {
        localStorage.removeItem(`design_cache_${filename}`);
        return true;
      } catch {
        return false;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      await Filesystem.deleteFile({
        path: `${CACHE_DIR}/${filename}`,
        directory: Directory.Cache,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete file';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  const listFiles = useCallback(async (directory?: string): Promise<FileInfo[]> => {
    if (!isAvailable) {
      // Fallback: List localStorage keys
      const files: FileInfo[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('design_cache_')) {
          files.push({
            name: key.replace('design_cache_', ''),
            path: key,
          });
        }
      }
      return files;
    }

    setIsLoading(true);
    setError(null);

    try {
      await ensureCacheDir();

      const result = await Filesystem.readdir({
        path: directory ? `${CACHE_DIR}/${directory}` : CACHE_DIR,
        directory: Directory.Cache,
      });

      return result.files.map((file) => ({
        name: file.name,
        path: file.uri,
        size: file.size,
        modifiedTime: file.mtime,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to list files';
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  const fileExists = useCallback(async (filename: string): Promise<boolean> => {
    if (!isAvailable) {
      return localStorage.getItem(`design_cache_${filename}`) !== null;
    }

    try {
      await Filesystem.stat({
        path: `${CACHE_DIR}/${filename}`,
        directory: Directory.Cache,
      });
      return true;
    } catch {
      return false;
    }
  }, [isAvailable]);

  const clearCache = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) {
      // Fallback: Clear localStorage cache
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('design_cache_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      return true;
    }

    setIsLoading(true);
    setError(null);

    try {
      await Filesystem.rmdir({
        path: CACHE_DIR,
        directory: Directory.Cache,
        recursive: true,
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear cache';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable]);

  return {
    isLoading,
    error,
    saveFile,
    readFile,
    deleteFile,
    listFiles,
    fileExists,
    clearCache,
    isAvailable,
  };
}

export default useFilesystem;
