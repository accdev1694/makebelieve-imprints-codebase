import { COLORS, EMAIL_CONFIG, formatOrderId, formatCurrency } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout } from '../../partials';
import { getButton } from '../../partials/button';

/**
 * Send cancellation request approved email to customer
 */
export async function sendCancellationRequestApprovedEmail(
  email: string,
  customerName: string,
  orderId: string,
  refundAmount: number | null,
  reviewNotes: string | null
): Promise<boolean> {
  const formattedRefund = refundAmount ? formatCurrency(refundAmount) : null;
  const subject = `Cancellation approved - Order #${formatOrderId(orderId)}`;

  const refundBox = formattedRefund ? `
    <div style="background: ${COLORS.bgSuccess}; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; color: #065f46; font-size: 14px;">Refund Amount:</p>
      <p style="margin: 5px 0 0; font-size: 28px; font-weight: bold; color: #059669;">${formattedRefund}</p>
      <p style="margin: 10px 0 0; color: ${COLORS.textSecondary}; font-size: 12px;">Will be credited within 5-10 business days</p>
    </div>
  ` : '';

  const notesSection = reviewNotes ? `
    <div style="background: ${COLORS.bgGray}; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 14px;"><strong>Note from our team:</strong> ${reviewNotes}</p>
    </div>
  ` : '';

  const content = `
    <h2 style="color: ${COLORS.textPrimary}; margin-top: 0;">Cancellation Approved</h2>

    <p>Hi ${customerName},</p>

    <p>Your cancellation request for order #${formatOrderId(orderId)} has been approved.</p>

    ${refundBox}

    ${notesSection}

    <p>We're sorry to see this order go. We hope to serve you again in the future!</p>

    ${getButton({ text: 'Continue Shopping', url: `${EMAIL_CONFIG.APP_URL}/products`, color: COLORS.success })}
  `;

  const html = wrapInLayout({ header: { color: COLORS.success }, content });

  const text = `
Cancellation Approved

Hi ${customerName},

Your cancellation request for order #${formatOrderId(orderId)} has been approved.

${formattedRefund ? `Refund Amount: ${formattedRefund}\nWill be credited within 5-10 business days.` : ''}

${reviewNotes ? `Note from our team: ${reviewNotes}` : ''}

We're sorry to see this order go. We hope to serve you again in the future!

Continue shopping: ${EMAIL_CONFIG.APP_URL}/products

---
${EMAIL_CONFIG.APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
