/**
 * Invoice Service
 * Handles invoice PDF generation and email delivery
 */

import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF, InvoiceData, InvoiceItem } from '@/lib/pdf/invoice';
import prisma from '@/lib/prisma';
import { sendInvoiceEmail } from './email';

interface OrderWithDetails {
  id: string;
  totalPrice: number | { toNumber(): number };
  createdAt: Date;
  customer: {
    name: string | null;
    email: string;
  };
  items: Array<{
    quantity: number;
    unitPrice: number | { toNumber(): number };
    totalPrice: number | { toNumber(): number };
    product?: {
      name: string;
    } | null;
    variant?: {
      name: string;
    } | null;
  }>;
}

interface InvoiceWithOrder {
  id: string;
  invoiceNumber: string;
  orderId: string;
  subtotal: number | { toNumber(): number };
  vatRate: number | { toNumber(): number };
  vatAmount: number | { toNumber(): number };
  total: number | { toNumber(): number };
  currency: string;
  issueDate: Date;
  dueDate: Date;
  order: OrderWithDetails;
}

/**
 * Generate invoice PDF buffer
 */
export async function generateInvoicePDF(invoice: InvoiceWithOrder): Promise<Buffer> {
  const order = invoice.order;

  // Build invoice items from order items
  const items: InvoiceItem[] = order.items.map((item) => {
    const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : item.unitPrice.toNumber();
    const totalPrice = typeof item.totalPrice === 'number' ? item.totalPrice : item.totalPrice.toNumber();

    // Build description
    let description = item.product?.name || 'Custom Print';
    if (item.variant?.name) {
      description += ` - ${item.variant.name}`;
    }

    return {
      description,
      quantity: item.quantity,
      unitPrice,
      total: totalPrice,
    };
  });

  // If no items, create a single line item from total
  if (items.length === 0) {
    const total = typeof invoice.total === 'number' ? invoice.total : invoice.total.toNumber();
    const subtotal = typeof invoice.subtotal === 'number' ? invoice.subtotal : invoice.subtotal.toNumber();
    items.push({
      description: 'Custom Print Order',
      quantity: 1,
      unitPrice: subtotal,
      total: total,
    });
  }

  const invoiceData: InvoiceData = {
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    customerName: order.customer.name || 'Customer',
    customerEmail: order.customer.email,
    orderReference: order.id.slice(0, 8).toUpperCase(),
    items,
    subtotal: typeof invoice.subtotal === 'number' ? invoice.subtotal : invoice.subtotal.toNumber(),
    vatRate: typeof invoice.vatRate === 'number' ? invoice.vatRate : invoice.vatRate.toNumber(),
    vatAmount: typeof invoice.vatAmount === 'number' ? invoice.vatAmount : invoice.vatAmount.toNumber(),
    total: typeof invoice.total === 'number' ? invoice.total : invoice.total.toNumber(),
    currency: invoice.currency,
  };

  const pdfBuffer = await renderToBuffer(InvoicePDF({ data: invoiceData }));
  return Buffer.from(pdfBuffer);
}

/**
 * Generate and send invoice PDF to customer
 * Called after invoice is created in accounting-service
 */
export async function generateAndSendInvoice(invoiceId: string): Promise<{
  success: boolean;
  pdfUrl?: string;
  error?: string;
}> {
  console.log(`[Invoice Service] Starting invoice generation for: ${invoiceId}`);

  try {
    // Get invoice with order details
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: {
          include: {
            customer: {
              select: {
                name: true,
                email: true,
              },
            },
            items: {
              include: {
                product: {
                  select: { name: true },
                },
                variant: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      console.error(`[Invoice Service] Invoice not found: ${invoiceId}`);
      return { success: false, error: 'Invoice not found' };
    }

    console.log(`[Invoice Service] Found invoice ${invoice.invoiceNumber} for customer ${invoice.order.customer.email}`);

    let pdfBase64: string | null = null;
    let pdfDataUrl: string | null = null;

    // Try to generate PDF - if it fails, still send email without attachment
    try {
      console.log(`[Invoice Service] Generating PDF for ${invoice.invoiceNumber}...`);
      const pdfBuffer = await generateInvoicePDF(invoice as unknown as InvoiceWithOrder);
      pdfBase64 = pdfBuffer.toString('base64');
      pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;
      console.log(`[Invoice Service] PDF generated successfully (${pdfBuffer.length} bytes)`);
    } catch (pdfError) {
      console.error(`[Invoice Service] PDF generation failed for ${invoice.invoiceNumber}:`, pdfError);
      // Continue without PDF - we'll send a plain email
    }

    // Send email (with or without PDF attachment)
    let emailSent = false;
    try {
      console.log(`[Invoice Service] Sending email to ${invoice.order.customer.email}...`);
      emailSent = await sendInvoiceEmail(
        invoice.order.customer.email,
        invoice.order.customer.name || 'Customer',
        invoice.invoiceNumber,
        invoice.order.id.slice(0, 8).toUpperCase(),
        typeof invoice.total === 'number' ? invoice.total : Number(invoice.total),
        pdfBase64 || '' // Empty string if PDF generation failed
      );
      console.log(`[Invoice Service] Email ${emailSent ? 'sent successfully' : 'FAILED'} to ${invoice.order.customer.email}`);
    } catch (emailError) {
      console.error(`[Invoice Service] Email sending failed for ${invoice.invoiceNumber}:`, emailError);
    }

    // Update invoice with PDF URL if we have one
    if (pdfDataUrl) {
      try {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { pdfUrl: pdfDataUrl },
        });
        console.log(`[Invoice Service] Invoice ${invoice.invoiceNumber} PDF URL stored`);
      } catch (updateError) {
        console.error(`[Invoice Service] Failed to update invoice with PDF URL:`, updateError);
      }
    }

    if (emailSent) {
      console.log(`[Invoice Service] SUCCESS - Invoice ${invoice.invoiceNumber} processed and sent to ${invoice.order.customer.email}`);
      return {
        success: true,
        pdfUrl: pdfDataUrl || undefined,
      };
    } else {
      console.error(`[Invoice Service] PARTIAL SUCCESS - Invoice ${invoice.invoiceNumber} processed but email failed`);
      return {
        success: false,
        pdfUrl: pdfDataUrl || undefined,
        error: 'Email sending failed',
      };
    }
  } catch (error) {
    console.error('[Invoice Service] CRITICAL ERROR generating/sending invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get invoice with full details for PDF generation
 */
export async function getInvoiceForPDF(invoiceId: string): Promise<InvoiceWithOrder | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      order: {
        include: {
          customer: {
            select: {
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                select: { name: true },
              },
              variant: {
                select: { name: true },
              },
            },
          },
        },
      },
    },
  });

  return invoice as unknown as InvoiceWithOrder | null;
}
