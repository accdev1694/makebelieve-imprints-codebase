import { Router, Request, Response } from 'express';
import { PrismaClient, PaymentMethod, PaymentStatus } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody, validateParams, commonSchemas } from '../utils/validation';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

/**
 * Validation schemas
 */
const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default('GBP'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  // Payment method specific fields (will be used when integrating Stripe/PayPal)
  paymentIntentId: z.string().optional(), // Stripe
  transactionId: z.string().optional(), // PayPal
  cardLast4: z.string().length(4).optional(), // Card
  cardBrand: z.string().optional(), // Card
});

/**
 * POST /api/payments
 * Process a payment
 * TODO: Integrate with Stripe/PayPal payment gateways
 */
router.post(
  '/',
  authenticate,
  validateBody(createPaymentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { orderId, invoiceId, amount, currency, paymentMethod, ...paymentDetails } = req.body;

    // Verify order exists and belongs to user
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.customerId !== req.user!.userId) {
      throw new ForbiddenError('Order does not belong to you');
    }

    // Check if payment already exists
    if (order.payment) {
      throw new ValidationError('Payment already exists for this order');
    }

    // Verify invoice exists and matches order
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (invoice.orderId !== orderId) {
      throw new ValidationError('Invoice does not match order');
    }

    // TODO: Process payment with Stripe/PayPal based on paymentMethod
    // For now, create payment record with PENDING status
    // Actual payment processing will be implemented when integrating payment gateways

    const payment = await prisma.payment.create({
      data: {
        orderId,
        invoiceId,
        customerId: req.user!.userId,
        amount,
        currency,
        paymentMethod,
        status: PaymentStatus.PENDING,
        ...paymentDetails,
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: { payment },
      message: 'Payment created. Integration with payment gateway pending.',
    });
  })
);

/**
 * GET /api/payments
 * List payments (user's own or all for admin)
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as PaymentStatus | undefined;

    const where =
      req.user!.type === 'admin'
        ? { ...(status && { status }) }
        : { customerId: req.user!.userId, ...(status && { status }) };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              status: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        payments,
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
 * GET /api/payments/:id
 * Get payment details
 */
router.get(
  '/:id',
  authenticate,
  validateParams(commonSchemas.uuidParam),
  asyncHandler(async (req: Request, res: Response) => {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            totalPrice: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Only owner or admin can view payment
    if (payment.customerId !== req.user!.userId && req.user!.type !== 'admin') {
      throw new ForbiddenError('Access denied');
    }

    res.json({
      success: true,
      data: { payment },
    });
  })
);

export default router;
