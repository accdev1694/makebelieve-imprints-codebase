import { COLORS, EMAIL_CONFIG, formatOrderId } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout } from '../../partials';
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
 * Send cancellation request received email to customer
 */
export async function sendCancellationRequestReceivedEmail(
  email: string,
  customerName: string,
  orderId: string,
  reason: string
): Promise<boolean> {
  const orderUrl = `${EMAIL_CONFIG.APP_URL}/orders/${orderId}`;
  const reasonText = CANCELLATION_REASON_LABELS[reason] || reason;
  const subject = `Cancellation request received - ${EMAIL_CONFIG.APP_NAME}`;

  const warningBox = `
    <div style="background: ${COLORS.bgWarning}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${COLORS.warning};">
      <p style="margin: 0; color: #92400e; font-size: 14px;">Order: <strong>#${formatOrderId(orderId)}</strong></p>
      <p style="margin: 10px 0 0; color: #92400e; font-size: 14px;">Reason: <strong>${reasonText}</strong></p>
      <p style="margin: 10px 0 0; color: #92400e; font-size: 14px;">Status: <strong>Pending Review</strong></p>
    </div>
  `;

  const content = `
    <h2 style="color: ${COLORS.textPrimary}; margin-top: 0;">Cancellation Request Received</h2>

    <p>Hi ${customerName},</p>

    <p>We've received your request to cancel your order.</p>

    ${warningBox}

    <p><strong>What happens next?</strong></p>
    <ul style="color: ${COLORS.textSecondary};">
      <li>Our team will review your request within 24 hours</li>
      <li>If your order hasn't started production, we'll approve the cancellation</li>
      <li>If production has begun, we may not be able to cancel</li>
      <li>You'll receive an email with our decision</li>
    </ul>

    ${getButton({ text: 'View Order Status', url: orderUrl })}
  `;

  const html = wrapInLayout({ content });

  const text = `
Cancellation Request Received

Hi ${customerName},

We've received your request to cancel your order.

Order: #${formatOrderId(orderId)}
Reason: ${reasonText}
Status: Pending Review

What happens next?
- Our team will review your request within 24 hours
- If your order hasn't started production, we'll approve the cancellation
- If production has begun, we may not be able to cancel
- You'll receive an email with our decision

View order status: ${orderUrl}

---
${EMAIL_CONFIG.APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
