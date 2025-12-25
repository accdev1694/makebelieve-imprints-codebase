/**
 * Camera Hook
 *
 * Provides camera functionality for design photo uploads.
 * Falls back to file input on web platforms.
 */

'use client';

import { useState, useCallback } from 'react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { isNativePlatform, isPluginAvailable } from './platform';

export interface CameraPhoto {
  dataUrl: string;
  format: string;
  webPath?: string;
}

export interface UseCameraResult {
  photo: CameraPhoto | null;
  isLoading: boolean;
  error: string | null;
  takePhoto: () => Promise<CameraPhoto | null>;
  pickFromGallery: () => Promise<CameraPhoto | null>;
  clearPhoto: () => void;
  isAvailable: boolean;
}

/**
 * Hook for camera functionality
 *
 * @example
 * ```tsx
 * const { photo, takePhoto, pickFromGallery, isLoading, error } = useCamera();
 *
 * const handleUpload = async () => {
 *   const result = await takePhoto();
 *   if (result) {
 *     // Upload result.dataUrl to server
 *   }
 * };
 * ```
 */
export function useCamera(): UseCameraResult {
  const [photo, setPhoto] = useState<CameraPhoto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAvailable = isNativePlatform() && isPluginAvailable('Camera');

  const processPhoto = (result: Photo): CameraPhoto => {
    return {
      dataUrl: result.dataUrl || `data:image/${result.format};base64,${result.base64String}`,
      format: result.format,
      webPath: result.webPath,
    };
  };

  const takePhoto = useCallback(async (): Promise<CameraPhoto | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check camera permissions first
      const permissions = await Camera.checkPermissions();

      if (permissions.camera === 'denied') {
        const requested = await Camera.requestPermissions({ permissions: ['camera'] });
        if (requested.camera === 'denied') {
          throw new Error('Camera permission denied. Please enable in settings.');
        }
      }

      const result = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        correctOrientation: true,
      });

      const processedPhoto = processPhoto(result);
      setPhoto(processedPhoto);
      return processedPhoto;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to take photo';
      // Don't set error if user cancelled
      if (!message.includes('cancelled') && !message.includes('canceled')) {
        setError(message);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pickFromGallery = useCallback(async (): Promise<CameraPhoto | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Check photo permissions first
      const permissions = await Camera.checkPermissions();

      if (permissions.photos === 'denied') {
        const requested = await Camera.requestPermissions({ permissions: ['photos'] });
        if (requested.photos === 'denied') {
          throw new Error('Photo library permission denied. Please enable in settings.');
        }
      }

      const result = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        correctOrientation: true,
      });

      const processedPhoto = processPhoto(result);
      setPhoto(processedPhoto);
      return processedPhoto;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to pick photo';
      // Don't set error if user cancelled
      if (!message.includes('cancelled') && !message.includes('canceled')) {
        setError(message);
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearPhoto = useCallback(() => {
    setPhoto(null);
    setError(null);
  }, []);

  return {
    photo,
    isLoading,
    error,
    takePhoto,
    pickFromGallery,
    clearPhoto,
    isAvailable,
  };
}

export default useCamera;
