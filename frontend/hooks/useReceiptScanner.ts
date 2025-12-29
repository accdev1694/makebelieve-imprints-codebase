'use client';

import { useState, useCallback } from 'react';
import { performOCR, preprocessImage } from '@/lib/ocr/tesseract-service';
import { parseReceipt, ParsedReceipt } from '@/lib/ocr/receipt-parser';

export type ScanStatus = 'idle' | 'preprocessing' | 'scanning' | 'parsing' | 'complete' | 'error';

export interface ScanResult {
  receipt: ParsedReceipt;
  imagePreview?: string;
}

export interface UseReceiptScannerReturn {
  status: ScanStatus;
  progress: number;
  progressMessage: string;
  result: ScanResult | null;
  error: string | null;
  scanReceipt: (file: File) => Promise<void>;
  reset: () => void;
}

/**
 * React hook for scanning receipts using Tesseract.js OCR
 * Provides state management for the scanning process
 */
export function useReceiptScanner(): UseReceiptScannerReturn {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setProgressMessage('');
    setResult(null);
    setError(null);
  }, []);

  const scanReceipt = useCallback(async (file: File) => {
    reset();

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      setStatus('error');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image file is too large. Maximum size is 10MB.');
      setStatus('error');
      return;
    }

    try {
      // Create preview URL
      const imagePreview = URL.createObjectURL(file);

      // Preprocessing step
      setStatus('preprocessing');
      setProgress(5);
      setProgressMessage('Preparing image...');

      let processedImage: Blob;
      try {
        processedImage = await preprocessImage(file);
      } catch {
        // If preprocessing fails, use original file
        processedImage = file;
      }

      // OCR scanning step
      setStatus('scanning');

      const ocrResult = await performOCR(processedImage, (p, msg) => {
        // Map OCR progress (0-100) to our progress (10-90)
        setProgress(10 + Math.round(p * 0.8));
        setProgressMessage(msg);
      });

      // Parsing step
      setStatus('parsing');
      setProgress(95);
      setProgressMessage('Extracting data...');

      const parsedReceipt = parseReceipt(ocrResult);

      // Complete
      setProgress(100);
      setProgressMessage('Complete!');
      setResult({
        receipt: parsedReceipt,
        imagePreview,
      });
      setStatus('complete');
    } catch (err) {
      console.error('Receipt scanning error:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan receipt');
      setStatus('error');
    }
  }, [reset]);

  return {
    status,
    progress,
    progressMessage,
    result,
    error,
    scanReceipt,
    reset,
  };
}
