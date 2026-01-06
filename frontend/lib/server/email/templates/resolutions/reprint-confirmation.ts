import { COLORS, EMAIL_CONFIG, formatOrderId } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout, getDivider, getMutedText } from '../../partials';
import { getButton } from '../../partials/button';

const reasonLabels: Record<string, string> = {
  DAMAGED_IN_TRANSIT: 'damaged during delivery',
  QUALITY_ISSUE: 'quality issue',
  WRONG_ITEM: 'wrong item sent',
  PRINTING_ERROR: 'printing error',
  OTHER: 'issue with your order',
};

/**
 * Send reprint confirmation email
 */
export async function sendReprintConfirmationEmail(
  email: string,
  customerName: string,
  originalOrderId: string,
  reprintOrderId: string,
  reason: string
): Promise<boolean> {
  const orderUrl = `${EMAIL_CONFIG.APP_URL}/account/orders/${reprintOrderId}`;
  const reasonText = reasonLabels[reason] || 'issue with your order';
  const subject = `Your replacement order is being processed - ${EMAIL_CONFIG.APP_NAME}`;

  const infoBox = `
    <div style="background: ${COLORS.bgGray}; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 14px;">Original Order: <strong>${formatOrderId(originalOrderId)}</strong></p>
      <p style="margin: 10px 0 0; color: ${COLORS.textSecondary}; font-size: 14px;">Replacement Order: <strong>${formatOrderId(reprintOrderId)}</strong></p>
    </div>
  `;

  const content = `
    <h2 style="color: ${COLORS.textPrimary}; margin-top: 0;">Replacement Order Confirmed</h2>

    <p>Hi ${customerName},</p>

    <p>We're sorry to hear about the ${reasonText}. We've created a replacement order for you at no additional cost.</p>

    ${infoBox}

    <p>Your replacement order is now being processed and will be dispatched soon. You'll receive tracking information once it ships.</p>

    ${getButton({ text: 'View Replacement Order', url: orderUrl })}

    <p>Thank you for your patience and understanding. We're committed to making things right!</p>

    ${getDivider()}

    ${getMutedText(`If you have any questions, please reply to this email or contact us at ${EMAIL_CONFIG.SUPPORT_EMAIL}`)}
  `;

  const html = wrapInLayout({ content });

  const text = `
Replacement Order Confirmed

Hi ${customerName},

We're sorry to hear about the ${reasonText}. We've created a replacement order for you at no additional cost.

Original Order: ${formatOrderId(originalOrderId)}
Replacement Order: ${formatOrderId(reprintOrderId)}

Your replacement order is now being processed and will be dispatched soon. You'll receive tracking information once it ships.

View your order: ${orderUrl}

Thank you for your patience and understanding. We're committed to making things right!

If you have any questions, please reply to this email or contact us at ${EMAIL_CONFIG.SUPPORT_EMAIL}

---
${EMAIL_CONFIG.APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
