import { COLORS, EMAIL_CONFIG, formatCurrency } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout, getDivider } from '../../partials';
import { getButton } from '../../partials/button';

/**
 * Send invoice email with PDF attachment
 */
export async function sendInvoiceEmail(
  email: string,
  customerName: string,
  invoiceNumber: string,
  orderReference: string,
  totalAmount: number,
  pdfBase64: string
): Promise<boolean> {
  const formattedTotal = formatCurrency(totalAmount);
  const orderUrl = `${EMAIL_CONFIG.APP_URL}/orders`;
  const subject = `Your Invoice ${invoiceNumber} from ${EMAIL_CONFIG.APP_NAME}`;

  const successBanner = `
    <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${COLORS.success};">
      <p style="margin: 0 0 10px; font-weight: bold; color: #166534;">Payment Confirmed</p>
      <p style="margin: 0; color: #166534;">Your invoice is attached to this email.</p>
    </div>
  `;

  const invoiceDetails = `
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: ${COLORS.textSecondary};">Invoice Number:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: ${COLORS.textSecondary};">Order Reference:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold;">#${orderReference}</td>
        </tr>
        <tr style="border-top: 1px solid ${COLORS.border};">
          <td style="padding: 12px 0; color: ${COLORS.textPrimary}; font-weight: bold;">Total Paid:</td>
          <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px; color: ${COLORS.primary};">${formattedTotal}</td>
        </tr>
      </table>
    </div>
  `;

  const content = `
    <h2 style="color: ${COLORS.textPrimary}; margin-top: 0;">Thank You for Your Order!</h2>

    <p>Hi ${customerName},</p>

    <p>Thank you for your order with ${EMAIL_CONFIG.APP_NAME}! Your payment has been successfully processed.</p>

    ${successBanner}

    ${invoiceDetails}

    <p>We'll start processing your order right away. You'll receive another email once your order has been dispatched.</p>

    ${getButton({ text: 'View Your Orders', url: orderUrl })}

    ${getDivider()}

    <p style="color: ${COLORS.textSecondary}; font-size: 14px; margin-bottom: 0;">
      If you have any questions about your order, please reply to this email or contact us at hello@makebelieveimprints.co.uk
    </p>
  `;

  const html = wrapInLayout({ content });

  const text = `
Thank You for Your Order!

Hi ${customerName},

Thank you for your order with ${EMAIL_CONFIG.APP_NAME}! Your payment has been successfully processed.

Invoice Number: ${invoiceNumber}
Order Reference: #${orderReference}
Total Paid: ${formattedTotal}

Your invoice is attached to this email as a PDF.

We'll start processing your order right away. You'll receive another email once your order has been dispatched.

View your orders: ${orderUrl}

If you have any questions, please reply to this email or contact us at hello@makebelieveimprints.co.uk

---
${EMAIL_CONFIG.APP_NAME}
Custom Print Services | United Kingdom
  `.trim();

  return sendEmail({
    to: email,
    subject,
    html,
    text,
    attachments: [
      {
        filename: `Invoice-${invoiceNumber}.pdf`,
        content: pdfBase64,
        contentType: 'application/pdf',
      },
    ],
  });
}
