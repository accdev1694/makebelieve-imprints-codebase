import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody, validateParams, commonSchemas } from '../utils/validation';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

/**
 * Validation schemas
 */
const createReviewSchema = z.object({
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

/**
 * POST /api/reviews
 * Create a review for an order
 */
router.post(
  '/',
  authenticate,
  validateBody(createReviewSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { orderId, rating, comment } = req.body;

    // Verify order exists and belongs to user
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { review: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.customerId !== req.user!.userId) {
      throw new ForbiddenError('Order does not belong to you');
    }

    // Check if review already exists
    if (order.review) {
      throw new ConflictError('Review already exists for this order');
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        orderId,
        reviewerId: req.user!.userId,
        rating,
        comment,
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: { review },
    });
  })
);

/**
 * GET /api/reviews
 * List reviews
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        skip,
        take: limit,
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count(),
    ]);

    // Calculate average rating
    const avgRating =
      await prisma.review.aggregate({
        _avg: {
          rating: true,
        },
      });

    res.json({
      success: true,
      data: {
        reviews,
        averageRating: avgRating._avg.rating || 0,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  })
);

/**
 * GET /api/reviews/:id
 * Get review by ID
 */
router.get(
  '/:id',
  validateParams(commonSchemas.uuidParam),
  asyncHandler(async (req: Request, res: Response) => {
    const review = await prisma.review.findUnique({
      where: { id: req.params.id },
      include: {
        order: {
          select: {
            id: true,
            status: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundError('Review not found');
    }

    res.json({
      success: true,
      data: { review },
    });
  })
);

export default router;
