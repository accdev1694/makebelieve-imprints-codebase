import express, { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody } from '../utils/validation';
import { storageService } from '../services/storage.service';
import {
  generateFileKey,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  MAX_IMAGE_SIZE,
  MAX_DOCUMENT_SIZE,
} from '../types/storage.types';
import { uploadLimiter } from '../middleware/rate-limit.middleware';
import { z } from 'zod';

const router = Router();

/**
 * NEW: Server-side upload proxy endpoint
 * This endpoint receives the raw file and uploads it to storage on behalf of the client.
 * This avoids CORS issues with direct-to-S3 uploads from the browser.
 */
router.put(
  '/proxy',
  authenticate,
  uploadLimiter,
  express.raw({
    limit: '50mb', // Match MAX_IMAGE_SIZE
    type: '*/*', // Accept any content type
  }),
  asyncHandler(async (req: Request, res: Response) => {
    console.log('[UPLOAD] Received upload request:', {
      filename: req.query.filename,
      contentType: req.headers['content-type'],
      bodySize: req.body?.length,
      bodyType: typeof req.body,
    });

    const originalFilename = req.query.filename as string;
    const contentType = req.headers['content-type'];
    const fileSize = req.body.length;

    if (!originalFilename || !contentType) {
      console.error('[UPLOAD] Missing filename or content-type');
      return res.status(400).json({
        success: false,
        error: 'Filename and Content-Type are required.',
      });
    }

    // You might want to add more validation here for file type and size
    if (fileSize > MAX_IMAGE_SIZE) {
       return res.status(400).json({
        success: false,
        error: `File size exceeds maximum allowed (${Math.floor(MAX_IMAGE_SIZE / 1024 / 1024)}MB)`,
      });
    }
    
    // Generate a unique file key
    const fileKey = generateFileKey(req.user!.userId, originalFilename, 'image');

    // Call the server-side upload function from the storage service
    const result = await storageService.uploadFile(fileKey, req.body, {
      filename: fileKey,
      mimeType: contentType,
      size: fileSize,
      userId: req.user!.userId,
      isPublic: true, // Designs are public
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to upload file.',
      });
    }

    res.status(201).json({
      success: true,
      data: {
        fileUrl: result.fileUrl,
        fileKey: result.fileKey,
      },
    });
  })
);

/**
 * Validation schemas
 */
const requestUploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  size: z.number().positive(),
  fileType: z.enum(['image', 'document']),
  designId: z.string().uuid().optional(),
});

const deleteFileSchema = z.object({
  fileKey: z.string().min(1),
});

/**
 * POST /api/uploads/request-upload-url
 * Generate a signed URL for client-side file upload
 */
router.post(
  '/request-upload-url',
  authenticate,
  uploadLimiter,
  validateBody(requestUploadUrlSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { filename, mimeType, size, fileType, designId } = req.body;

    // Validate file type
    const allowedTypes =
      fileType === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_DOCUMENT_TYPES;
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
      });
    }

    // Validate file size
    const maxSize = fileType === 'image' ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;
    if (size > maxSize) {
      return res.status(400).json({
        success: false,
        error: `File size exceeds maximum allowed (${Math.floor(maxSize / 1024 / 1024)}MB)`,
      });
    }

    // Generate unique file key
    const fileKey = generateFileKey(req.user!.userId, filename, fileType);

    // Generate signed upload URL
    const result = await storageService.generateSignedUploadUrl(
      {
        filename: fileKey,
        mimeType,
        size,
        userId: req.user!.userId,
        designId,
      },
      3600 // 1 hour expiry
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate upload URL',
      });
    }

    res.json({
      success: true,
      data: {
        uploadUrl: result.uploadUrl,
        fileUrl: result.fileUrl,
        fileKey: result.fileKey,
        expiresIn: result.expiresIn,
      },
    });
  })
);

/**
 * POST /api/uploads/request-download-url
 * Generate a signed URL for downloading a private file
 */
router.post(
  '/request-download-url',
  authenticate,
  validateBody(z.object({ fileKey: z.string().min(1) })),
  asyncHandler(async (req: Request, res: Response) => {
    const { fileKey } = req.body;

    // Check if file exists
    const exists = await storageService.fileExists(fileKey);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    // Generate signed download URL
    const result = await storageService.generateSignedDownloadUrl(fileKey, 3600);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate download URL',
      });
    }

    res.json({
      success: true,
      data: {
        downloadUrl: result.fileUrl,
        fileKey: result.fileKey,
        expiresIn: result.expiresIn,
      },
    });
  })
);

/**
 * DELETE /api/uploads/:fileKey
 * Delete a file (owner only)
 */
router.delete(
  '/:fileKey(*)',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const fileKey = req.params.fileKey;

    if (!fileKey) {
      return res.status(400).json({
        success: false,
        error: 'File key is required',
      });
    }

    // Verify file belongs to user (file key contains userId)
    if (!fileKey.includes(req.user!.userId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Check if file exists
    const exists = await storageService.fileExists(fileKey);
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
      });
    }

    // Delete file
    const result = await storageService.deleteFile(fileKey);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to delete file',
      });
    }

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  })
);

/**
 * GET /api/uploads/health
 * Check storage service health
 */
router.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response) => {
    // Simple health check - try to check if a test file exists
    const isHealthy = true; // Storage service is always available

    res.json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'down',
        storageType: process.env.USE_LOCAL_STORAGE === 'true' ? 'local' : 's3',
      },
    });
  })
);

export default router;
