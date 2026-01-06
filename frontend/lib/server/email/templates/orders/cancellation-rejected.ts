import { COLORS, EMAIL_CONFIG, formatOrderId } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout, getDivider, getMutedText } from '../../partials';
import { getButton } from '../../partials/button';

/**
 * Send cancellation request rejected email to customer
 */
export async function sendCancellationRequestRejectedEmail(
  email: string,
  customerName: string,
  orderId: string,
  reviewNotes: string | null
): Promise<boolean> {
  const orderUrl = `${EMAIL_CONFIG.APP_URL}/orders/${orderId}`;
  const subject = `Cancellation request update - Order #${formatOrderId(orderId)}`;

  const dangerBox = `
    <div style="background: ${COLORS.bgDanger}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${COLORS.danger};">
      <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: bold;">Reason:</p>
      <p style="margin: 10px 0 0; color: #991b1b;">${reviewNotes || 'Your order has already entered production and cannot be cancelled.'}</p>
    </div>
  `;

  const content = `
    <h2 style="color: ${COLORS.textPrimary}; margin-top: 0;">Cancellation Request Update</h2>

    <p>Hi ${customerName},</p>

    <p>We've reviewed your cancellation request for order #${formatOrderId(orderId)}, and unfortunately we're unable to cancel this order at this time.</p>

    ${dangerBox}

    <p>Your order will continue to be processed and shipped as normal. Once you receive your order, if there are any issues with it, you can submit a return or exchange request.</p>

    ${getButton({ text: 'View Order Status', url: orderUrl })}

    ${getDivider()}

    ${getMutedText(`If you have any questions, please contact us at ${EMAIL_CONFIG.SUPPORT_EMAIL}`)}
  `;

  const html = wrapInLayout({ content });

  const text = `
Cancellation Request Update

Hi ${customerName},

We've reviewed your cancellation request for order #${formatOrderId(orderId)}, and unfortunately we're unable to cancel this order at this time.

Reason: ${reviewNotes || 'Your order has already entered production and cannot be cancelled.'}

Your order will continue to be processed and shipped as normal. Once you receive your order, if there are any issues with it, you can submit a return or exchange request.

View order status: ${orderUrl}

If you have any questions, please contact us at ${EMAIL_CONFIG.SUPPORT_EMAIL}

---
${EMAIL_CONFIG.APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
