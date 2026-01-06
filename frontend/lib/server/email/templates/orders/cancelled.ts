import { COLORS, EMAIL_CONFIG, formatOrderId, formatCurrency } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout, getDivider, getMutedText } from '../../partials';
import { getButton } from '../../partials/button';

const CANCELLATION_REASON_LABELS: Record<string, string> = {
  OUT_OF_STOCK: 'Item out of stock',
  BUYER_REQUEST: 'Customer request',
  FRAUD_SUSPECTED: 'Payment verification issue',
  PAYMENT_ISSUE: 'Payment processing issue',
  PRODUCTION_ISSUE: 'Production issue',
  DUPLICATE_ORDER: 'Duplicate order',
  OTHER: 'Other',
};

/**
 * Send order cancelled email to customer (when admin cancels)
 */
export async function sendOrderCancelledBySellerEmail(
  email: string,
  customerName: string,
  orderId: string,
  reason: string,
  notes: string | null,
  refundAmount: number | null
): Promise<boolean> {
  const reasonText = CANCELLATION_REASON_LABELS[reason] || reason;
  const formattedRefund = refundAmount ? formatCurrency(refundAmount) : null;
  const subject = `Your order has been cancelled - ${EMAIL_CONFIG.APP_NAME}`;

  const infoBox = `
    <div style="background: ${COLORS.bgGray}; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 14px;">Order: <strong>#${formatOrderId(orderId)}</strong></p>
      <p style="margin: 10px 0 0; color: ${COLORS.textSecondary}; font-size: 14px;">Reason: <strong>${reasonText}</strong></p>
      ${notes ? `<p style="margin: 10px 0 0; color: ${COLORS.textSecondary}; font-size: 14px;">Notes: ${notes}</p>` : ''}
    </div>
  `;

  const refundBox = formattedRefund ? `
    <div style="background: ${COLORS.bgSuccess}; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; color: #065f46; font-size: 14px;">Refund Amount:</p>
      <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold; color: #059669;">${formattedRefund}</p>
      <p style="margin: 10px 0 0; color: ${COLORS.textSecondary}; font-size: 12px;">Will be credited to your original payment method within 5-10 business days</p>
    </div>
  ` : '';

  const content = `
    <h2 style="color: ${COLORS.textPrimary}; margin-top: 0;">Order Cancelled</h2>

    <p>Hi ${customerName},</p>

    <p>We're sorry to inform you that your order has been cancelled.</p>

    ${infoBox}

    ${refundBox}

    <p>We sincerely apologise for any inconvenience this may have caused. If you have any questions, please don't hesitate to contact us.</p>

    ${getButton({ text: 'Continue Shopping', url: `${EMAIL_CONFIG.APP_URL}/products` })}

    ${getDivider()}

    ${getMutedText(`If you have any questions, please contact us at ${EMAIL_CONFIG.SUPPORT_EMAIL}`)}
  `;

  const html = wrapInLayout({ content });

  const text = `
Order Cancelled

Hi ${customerName},

We're sorry to inform you that your order has been cancelled.

Order: #${formatOrderId(orderId)}
Reason: ${reasonText}
${notes ? `Notes: ${notes}` : ''}

${formattedRefund ? `Refund Amount: ${formattedRefund}\nWill be credited to your original payment method within 5-10 business days.` : ''}

We sincerely apologise for any inconvenience this may have caused. If you have any questions, please don't hesitate to contact us.

Continue shopping: ${EMAIL_CONFIG.APP_URL}/products

If you have any questions, please contact us at ${EMAIL_CONFIG.SUPPORT_EMAIL}

---
${EMAIL_CONFIG.APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
