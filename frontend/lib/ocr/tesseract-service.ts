import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
  }>;
}

export type OCRProgressCallback = (progress: number, status: string) => void;

/**
 * Performs OCR on an image using Tesseract.js
 * Runs entirely in the browser - no API costs
 */
export async function performOCR(
  imageSource: File | string | Blob,
  onProgress?: OCRProgressCallback
): Promise<OCRResult> {
  try {
    const result = await Tesseract.recognize(imageSource, 'eng', {
      logger: (m) => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress(Math.round(m.progress * 100), 'Scanning receipt...');
        } else if (onProgress && m.status === 'loading tesseract core') {
          onProgress(0, 'Loading OCR engine...');
        } else if (onProgress && m.status === 'initializing tesseract') {
          onProgress(10, 'Initializing...');
        } else if (onProgress && m.status === 'loading language traineddata') {
          onProgress(20, 'Loading language model...');
        } else if (onProgress && m.status === 'initializing api') {
          onProgress(30, 'Preparing scanner...');
        }
      },
    });

    // Extract words from lines (Tesseract.js v5 structure)
    const words: Array<{ text: string; confidence: number }> = [];
    const data = result.data as unknown as {
      text: string;
      confidence: number;
      lines?: Array<{ words: Array<{ text: string; confidence: number }> }>;
    };

    if (data.lines) {
      for (const line of data.lines) {
        if (line.words) {
          for (const word of line.words) {
            words.push({
              text: word.text,
              confidence: word.confidence,
            });
          }
        }
      }
    }

    return {
      text: data.text,
      confidence: data.confidence,
      words,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('OCR error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to process image'
    );
  }
}

/**
 * Preprocess image for better OCR results
 * Creates a canvas and applies contrast/brightness adjustments
 */
export async function preprocessImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Scale down large images to improve processing speed
      const maxDimension = 2000;
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Apply contrast enhancement for better text recognition
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // Convert to grayscale and increase contrast
      for (let i = 0; i < data.length; i += 4) {
        // Grayscale using luminosity method
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;

        // Increase contrast
        const contrast = 1.3; // Adjust as needed
        const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
        const adjusted = Math.min(255, Math.max(0, factor * (gray - 128) + 128));

        data[i] = adjusted;
        data[i + 1] = adjusted;
        data[i + 2] = adjusted;
      }

      ctx.putImageData(imageData, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        'image/png',
        1.0
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
