import { Router, Request, Response } from 'express';
import { PrismaClient, InvoiceStatus } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateParams, commonSchemas } from '../utils/validation';
import { NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/invoices
 * List invoices (user's own or all for admin)
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as InvoiceStatus | undefined;

    const where =
      req.user!.type === 'admin'
        ? { ...(status && { status }) }
        : { order: { customerId: req.user!.userId }, ...(status && { status }) };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              status: true,
              totalPrice: true,
              customerId: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
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
          },
        },
        orderBy: { issueDate: 'desc' },
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        invoices,
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
 * GET /api/invoices/:id
 * Get invoice details
 */
router.get(
  '/:id',
  authenticate,
  validateParams(commonSchemas.uuidParam),
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: {
        order: {
          select: {
            id: true,
            customerId: true,
            status: true,
            totalPrice: true,
            shippingAddress: true,
            design: {
              select: {
                id: true,
                title: true,
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
            payment: {
              select: {
                id: true,
                status: true,
                paymentMethod: true,
                amount: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Only owner or admin can view invoice
    if (invoice.order.customerId !== req.user!.userId && req.user!.type !== 'admin') {
      throw new ForbiddenError('Access denied');
    }

    res.json({
      success: true,
      data: { invoice },
    });
  })
);

/**
 * GET /api/invoices/:id/pdf
 * Get invoice PDF URL
 */
router.get(
  '/:id/pdf',
  authenticate,
  validateParams(commonSchemas.uuidParam),
  asyncHandler(async (req: Request, res: Response) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        pdfUrl: true,
        invoiceNumber: true,
        order: {
          select: {
            customerId: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Only owner or admin can download invoice PDF
    if (invoice.order.customerId !== req.user!.userId && req.user!.type !== 'admin') {
      throw new ForbiddenError('Access denied');
    }

    if (!invoice.pdfUrl) {
      throw new NotFoundError('Invoice PDF not yet generated');
    }

    res.json({
      success: true,
      data: {
        pdfUrl: invoice.pdfUrl,
        invoiceNumber: invoice.invoiceNumber,
      },
    });
  })
);

export default router;
