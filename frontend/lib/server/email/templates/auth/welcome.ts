import { COLORS, EMAIL_CONFIG } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout, getDivider } from '../../partials';
import { getButton } from '../../partials/button';

/**
 * Send welcome email after subscription is confirmed
 */
export async function sendWelcomeEmail(email: string): Promise<boolean> {
  const shopUrl = `${EMAIL_CONFIG.APP_URL}/products`;
  const unsubscribeUrl = `${EMAIL_CONFIG.APP_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
  const subject = `Welcome to ${EMAIL_CONFIG.APP_NAME}! Here's your 10% discount`;

  const discountBox = `
    <div style="background: ${COLORS.bgGray}; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
      <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 14px;">Your exclusive discount code:</p>
      <p style="margin: 10px 0 0; font-size: 28px; font-weight: bold; color: ${COLORS.primary}; letter-spacing: 2px;">WELCOME10</p>
      <p style="margin: 5px 0 0; color: ${COLORS.textSecondary}; font-size: 12px;">Use at checkout for 10% off your first order</p>
    </div>
  `;

  const content = `
    <h2 style="color: #1f2937; margin-top: 0;">Welcome to the Family!</h2>

    <p>Your subscription is now confirmed. Thank you for joining us!</p>

    ${discountBox}

    ${getButton({ text: 'Start Shopping', url: shopUrl })}

    ${getDivider()}

    <p style="color: ${COLORS.textMuted}; font-size: 12px; text-align: center;">
      <a href="${unsubscribeUrl}" style="color: ${COLORS.textMuted};">Unsubscribe</a>
    </p>
  `;

  const html = wrapInLayout({ content });

  const text = `
Welcome to the Family!

Your subscription is now confirmed. Thank you for joining us!

Your exclusive discount code: WELCOME10
Use at checkout for 10% off your first order

Start shopping: ${shopUrl}

---
To unsubscribe: ${unsubscribeUrl}

${EMAIL_CONFIG.APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
