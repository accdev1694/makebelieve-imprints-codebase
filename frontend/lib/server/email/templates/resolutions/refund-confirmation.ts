import { COLORS, EMAIL_CONFIG, formatCurrency, formatOrderId } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout, getDivider, getMutedText } from '../../partials';

const reasonLabels: Record<string, string> = {
  DAMAGED_IN_TRANSIT: 'damage during delivery',
  QUALITY_ISSUE: 'quality issue',
  WRONG_ITEM: 'wrong item sent',
  PRINTING_ERROR: 'printing error',
  OTHER: 'issue with your order',
};

/**
 * Send refund confirmation email
 */
export async function sendRefundConfirmationEmail(
  email: string,
  customerName: string,
  orderId: string,
  amount: number,
  reason: string
): Promise<boolean> {
  const reasonText = reasonLabels[reason] || 'issue with your order';
  const formattedAmount = formatCurrency(amount);
  const subject = `Your refund has been processed - ${EMAIL_CONFIG.APP_NAME}`;

  const refundBox = `
    <div style="background: ${COLORS.bgGray}; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 14px;">Order: <strong>${formatOrderId(orderId)}</strong></p>
      <p style="margin: 10px 0 0; font-size: 24px; font-weight: bold; color: ${COLORS.success};">Refund Amount: ${formattedAmount}</p>
    </div>
  `;

  const content = `
    <h2 style="color: #1f2937; margin-top: 0;">Refund Processed</h2>

    <p>Hi ${customerName},</p>

    <p>We're sorry to hear about the ${reasonText}. We've processed a full refund for your order.</p>

    ${refundBox}

    <p>The refund will be credited to your original payment method. Please allow 5-10 business days for the refund to appear on your statement, depending on your bank.</p>

    <p>We apologise for any inconvenience caused. We value your business and hope to serve you again in the future.</p>

    ${getDivider()}

    ${getMutedText(`If you have any questions, please reply to this email or contact us at ${EMAIL_CONFIG.SUPPORT_EMAIL}`)}
  `;

  const html = wrapInLayout({ content });

  const text = `
Refund Processed

Hi ${customerName},

We're sorry to hear about the ${reasonText}. We've processed a full refund for your order.

Order: ${formatOrderId(orderId)}
Refund Amount: ${formattedAmount}

The refund will be credited to your original payment method. Please allow 5-10 business days for the refund to appear on your statement, depending on your bank.

We apologise for any inconvenience caused. We value your business and hope to serve you again in the future.

If you have any questions, please reply to this email or contact us at ${EMAIL_CONFIG.SUPPORT_EMAIL}

---
${EMAIL_CONFIG.APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
