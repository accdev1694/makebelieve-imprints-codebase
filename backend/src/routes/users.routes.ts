import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody, validateParams, commonSchemas } from '../utils/validation';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

/**
 * Validation schemas
 */
const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  profile: z.record(z.any()).optional(),
});

/**
 * GET /api/users/me
 * Get current user profile
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        type: true,
        profile: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({
      success: true,
      data: { user },
    });
  })
);

/**
 * PUT /api/users/me
 * Update current user profile
 */
router.put(
  '/me',
  authenticate,
  validateBody(updateProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, profile } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        ...(name && { name }),
        ...(profile && { profile }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        type: true,
        profile: true,
        updatedAt: true,
      },
    });

    res.json({
      success: true,
      data: { user },
    });
  })
);

/**
 * GET /api/users/:id
 * Get user by ID (public info only)
 */
router.get(
  '/:id',
  authenticate,
  validateParams(commonSchemas.uuidParam),
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        // Only show email to admins or the user themselves
        ...(req.user!.type === 'admin' || req.user!.userId === req.params.id
          ? { email: true, profile: true }
          : {}),
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json({
      success: true,
      data: { user },
    });
  })
);

/**
 * GET /api/users
 * List all users (admin only)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          type: true,
          createdAt: true,
          _count: {
            select: {
              orders: true,
              designs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    res.json({
      success: true,
      data: {
        users,
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
 * DELETE /api/users/:id
 * Delete user (admin only)
 */
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validateParams(commonSchemas.uuidParam),
  asyncHandler(async (req: Request, res: Response) => {
    // Prevent admin from deleting themselves
    if (req.user!.userId === req.params.id) {
      throw new ForbiddenError('Cannot delete your own account');
    }

    await prisma.user.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  })
);

export default router;
