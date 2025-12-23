import { Router, Request, Response } from 'express';
import {
  PrismaClient,
  PrintSize,
  Material,
  Orientation,
  OrderStatus,
} from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody, validateParams, commonSchemas } from '../utils/validation';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { z } from 'zod';
import { orderLimiter } from '../middleware/rate-limit.middleware';

const router = Router();
const prisma = new PrismaClient();

/**
 * Validation schemas
 */
const createOrderSchema = z.object({
  designId: z.string().uuid(),
  printSize: z.nativeEnum(PrintSize),
  material: z.nativeEnum(Material),
  orientation: z.nativeEnum(Orientation),
  printWidth: z.number().int().positive(),
  printHeight: z.number().int().positive(),
  previewUrl: z.string().url().optional(),
  shippingAddress: z.object({
    name: z.string(),
    addressLine1: z.string(),
    addressLine2: z.string().optional(),
    city: z.string(),
    postcode: z.string(),
    country: z.string().default('UK'),
  }),
  totalPrice: z.number().positive(),
});

const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

/**
 * POST /api/orders
 * Create a new order
 */
router.post(
  '/',
  authenticate,
  orderLimiter, // Limit order creation to prevent spam
  validateBody(createOrderSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { designId, ...orderData } = req.body;

    // Verify design exists and belongs to user
    const design = await prisma.design.findUnique({
      where: { id: designId },
    });

    if (!design) {
      throw new NotFoundError('Design not found');
    }

    if (design.userId !== req.user!.userId) {
      throw new ForbiddenError('Design does not belong to you');
    }

    // Create order
    const order = await prisma.order.create({
      data: {
        ...orderData,
        designId,
        customerId: req.user!.userId,
      },
      include: {
        design: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: { order },
    });
  })
);

/**
 * GET /api/orders
 * List orders (user's own or all for admin)
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as OrderStatus | undefined;

    const where =
      req.user!.type === 'admin'
        ? { ...(status && { status }) }
        : { customerId: req.user!.userId, ...(status && { status }) };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          design: {
            select: {
              id: true,
              title: true,
              fileUrl: true,
              previewUrl: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              total: true,
            },
          },
          payment: {
            select: {
              id: true,
              status: true,
              paymentMethod: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        orders,
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
 * GET /api/orders/:id
 * Get order details
 */
router.get(
  '/:id',
  authenticate,
  validateParams(commonSchemas.uuidParam),
  asyncHandler(async (req: Request, res: Response) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        design: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        invoice: true,
        payment: true,
        review: true,
        inventoryUsages: {
          include: {
            inventory: {
              select: {
                id: true,
                itemName: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Only owner or admin can view order
    if (order.customerId !== req.user!.userId && req.user!.type !== 'admin') {
      throw new ForbiddenError('Access denied');
    }

    res.json({
      success: true,
      data: { order },
    });
  })
);

/**
 * PUT /api/orders/:id/status
 * Update order status (admin only)
 */
router.put(
  '/:id/status',
  authenticate,
  requireAdmin,
  validateParams(commonSchemas.uuidParam),
  validateBody(updateOrderStatusSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        design: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // TODO: Send email notification to customer about status change

    res.json({
      success: true,
      data: { order },
    });
  })
);

/**
 * GET /api/orders/:id/download/:itemId
 * Generate a download link for a digital product in an order
 */
router.get(
  '/:id/download/:itemId',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id: orderId, itemId } = req.params;

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          where: { id: itemId },
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Only owner can download
    if (order.customerId !== req.user!.userId) {
      throw new ForbiddenError('Access denied');
    }

    // Check if order is completed/paid
    if (order.status !== 'DELIVERED' && order.status !== 'SHIPPED') {
      // For now, allow downloads for any confirmed order (mock implementation)
      if (order.status !== 'CONFIRMED' && order.status !== 'PRINTING') {
        throw new ForbiddenError('Order must be confirmed before downloading');
      }
    }

    const orderItem = order.items[0];
    if (!orderItem) {
      throw new NotFoundError('Order item not found');
    }

    // Check if product is digital
    if (orderItem.product?.category !== 'DIGITAL') {
      throw new ValidationError('This product is not a digital download');
    }

    // Generate download URL (mock implementation)
    // In production, this would use the storage service to generate a signed URL
    const downloadUrl = orderItem.product.seoKeywords || `https://downloads.example.com/${itemId}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Track download (update metadata if OrderItem has it)
    // This is a simplified implementation

    res.json({
      success: true,
      data: {
        downloadUrl,
        expiresAt: expiresAt.toISOString(),
        productName: orderItem.product?.name,
        fileName: `${orderItem.product?.slug || 'download'}.pdf`,
      },
    });
  })
);

/**
 * GET /api/orders/downloads
 * List all digital downloads for the current user
 */
router.get(
  '/user/downloads',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    // Find all orders with digital products
    const orders = await prisma.order.findMany({
      where: {
        customerId: req.user!.userId,
        status: {
          in: ['CONFIRMED', 'PRINTING', 'SHIPPED', 'DELIVERED'],
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                category: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter to only digital products
    const digitalDownloads = orders.flatMap(order =>
      order.items
        .filter(item => item.product?.category === 'DIGITAL')
        .map(item => ({
          orderId: order.id,
          orderItemId: item.id,
          orderDate: order.createdAt,
          orderStatus: order.status,
          product: item.product,
          quantity: item.quantity,
        }))
    );

    res.json({
      success: true,
      data: {
        downloads: digitalDownloads,
        total: digitalDownloads.length,
      },
    });
  })
);

export default router;
