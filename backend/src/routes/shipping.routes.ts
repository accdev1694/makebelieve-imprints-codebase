import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody, validateParams, commonSchemas } from '../utils/validation';
import { NotFoundError } from '../utils/errors';
import { royalMailService } from '../services/royalmail.service';
import { z } from 'zod';

const router = Router();

/**
 * Validation schemas
 */
const createShipmentSchema = z.object({
  orderId: z.string().uuid(),
  recipientAddress: z.object({
    name: z.string(),
    addressLine1: z.string(),
    addressLine2: z.string().optional(),
    city: z.string(),
    postcode: z.string(),
    country: z.string().default('UK'),
    phoneNumber: z.string().optional(),
    email: z.string().email().optional(),
  }),
  packageDetails: z.object({
    weight: z.number().positive(), // in grams
    length: z.number().positive(), // in cm
    width: z.number().positive(),
    height: z.number().positive(),
    value: z.number().positive(), // in GBP
    description: z.string(),
    contents: z.string().optional(),
  }),
  serviceCode: z.string().optional(),
  safePlace: z.string().optional(),
  requiresSignature: z.boolean().optional(),
});

const trackingParamSchema = z.object({
  trackingNumber: z.string().min(1),
});

/**
 * POST /api/shipping/shipments
 * Create a shipment with Royal Mail (admin only)
 */
router.post(
  '/shipments',
  authenticate,
  requireAdmin,
  validateBody(createShipmentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    // TODO: Get sender address from business settings/env
    const senderAddress = {
      name: process.env.BUSINESS_NAME || 'MakeBelieve Imprints',
      addressLine1: process.env.BUSINESS_ADDRESS_LINE1 || '123 Print Street',
      addressLine2: process.env.BUSINESS_ADDRESS_LINE2,
      city: process.env.BUSINESS_CITY || 'London',
      postcode: process.env.BUSINESS_POSTCODE || 'SW1A 1AA',
      country: 'UK',
    };

    const shipmentRequest = {
      ...req.body,
      senderAddress,
    };

    const result = await royalMailService.createShipment(shipmentRequest);

    if (!result.success) {
      res.status(400).json({
        success: false,
        errors: result.errors,
      });
      return;
    }

    res.status(201).json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/shipping/tracking/:trackingNumber
 * Get tracking status for a shipment
 */
router.get(
  '/tracking/:trackingNumber',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { trackingNumber } = req.params;

    if (!trackingNumber) {
      throw new NotFoundError('Tracking number is required');
    }

    const result = await royalMailService.getTrackingStatus(trackingNumber);

    if (!result.success) {
      res.status(404).json({
        success: false,
        errors: result.errors,
      });
      return;
    }

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /api/shipping/health
 * Check Royal Mail API health
 */
router.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response) => {
    const health = await royalMailService.healthCheck();

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: health.success,
      data: health,
    });
  })
);

export default router;
