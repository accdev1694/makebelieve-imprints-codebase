'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useCamera } from '@/lib/native';
import { Camera, ImageIcon } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  preview?: string;
}

/**
 * Convert a data URL to a File object
 */
function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export function FileUpload({
  onFileSelect,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxSize = 10,
  preview,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>('');

  // Native camera hook
  const { takePhoto, pickFromGallery, isAvailable: isCameraAvailable, isLoading: isCameraLoading } = useCamera();

  const validateFile = useCallback(
    (file: File): boolean => {
      setError('');

      // Check file type
      if (!acceptedTypes.includes(file.type)) {
        setError(`File type not supported. Please upload: ${acceptedTypes.join(', ')}`);
        return false;
      }

      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxSize) {
        setError(`File too large. Maximum size: ${maxSize}MB`);
        return false;
      }

      return true;
    },
    [acceptedTypes, maxSize]
  );

  const handleFile = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        onFileSelect(file);
      }
    },
    [onFileSelect, validateFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  // Handle taking photo with camera (native only)
  const handleTakePhoto = async () => {
    setError('');
    const result = await takePhoto();
    if (result) {
      const file = dataUrlToFile(result.dataUrl, `camera-${Date.now()}.${result.format}`);
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  // Handle picking from gallery (native only)
  const handlePickFromGallery = async () => {
    setError('');
    const result = await pickFromGallery();
    if (result) {
      const file = dataUrlToFile(result.dataUrl, `gallery-${Date.now()}.${result.format}`);
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  return (
    <div className="space-y-4">
      <Card
        className={`
          relative overflow-hidden transition-all duration-300
          ${isDragging ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-border bg-card/50'}
          ${preview ? 'p-0' : 'p-8'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {preview ? (
          <div className="relative group">
            <Image
              src={preview}
              alt="Preview"
              width={0}
              height={0}
              sizes="100vw"
              className="w-full h-auto max-h-96 object-contain"
              unoptimized
            />
            <div className="absolute inset-0 dark:bg-black/60 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
              {isCameraAvailable ? (
                /* Native platform - show camera and gallery buttons */
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="gap-1"
                    onClick={handleTakePhoto}
                    disabled={isCameraLoading}
                  >
                    <Camera className="h-4 w-4" />
                    Camera
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="gap-1"
                    onClick={handlePickFromGallery}
                    disabled={isCameraLoading}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Gallery
                  </Button>
                </>
              ) : (
                /* Web platform - show file chooser */
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Button type="button" variant="secondary" asChild>
                    <span>Change Image</span>
                  </Button>
                </label>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-md bg-primary/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
            </div>

            <div>
              <p className="text-lg font-medium text-foreground mb-2">
                {isDragging ? 'Drop your image here' : 'Upload your design'}
              </p>
              <p className="text-sm text-muted-foreground">Drag and drop or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports: JPG, PNG, WebP, GIF (Max {maxSize}MB)
              </p>
            </div>

            {isCameraAvailable ? (
              /* Native platform - show camera and gallery buttons */
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  type="button"
                  className="btn-gradient gap-2"
                  onClick={handleTakePhoto}
                  disabled={isCameraLoading}
                >
                  <Camera className="h-4 w-4" />
                  {isCameraLoading ? 'Opening...' : 'Take Photo'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={handlePickFromGallery}
                  disabled={isCameraLoading}
                >
                  <ImageIcon className="h-4 w-4" />
                  Photo Library
                </Button>
              </div>
            ) : (
              /* Web platform - show file chooser */
              <label htmlFor="file-upload">
                <Button type="button" className="btn-gradient" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
            )}
          </div>
        )}

        <input
          id="file-upload"
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />
      </Card>

      {error && (
        <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
