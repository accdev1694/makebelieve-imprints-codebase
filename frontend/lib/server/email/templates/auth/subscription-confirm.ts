import { EMAIL_CONFIG } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout, getDivider, getMutedText } from '../../partials';
import { getButton } from '../../partials/button';

/**
 * Send subscription confirmation email (double opt-in)
 */
export async function sendSubscriptionConfirmEmail(
  email: string,
  confirmToken: string
): Promise<boolean> {
  const confirmUrl = `${EMAIL_CONFIG.APP_URL}/api/subscribers/confirm?token=${confirmToken}`;
  const subject = `Confirm your subscription to ${EMAIL_CONFIG.APP_NAME}`;

  const content = `
    <h2 style="color: #1f2937; margin-top: 0;">Confirm Your Subscription</h2>

    <p>Thanks for signing up for our newsletter!</p>

    <p>Please confirm your email address by clicking the button below:</p>

    ${getButton({ text: 'Confirm Subscription', url: confirmUrl })}

    <p style="color: #6b7280; font-size: 14px;">Once confirmed, you'll receive:</p>
    <ul style="color: #6b7280; font-size: 14px;">
      <li>Exclusive deals and promotions</li>
      <li>New product announcements</li>
      <li>10% off your first order</li>
    </ul>

    ${getDivider()}

    ${getMutedText("If you didn't sign up for this newsletter, you can safely ignore this email.")}
  `;

  const html = wrapInLayout({ content });

  const text = `
Confirm Your Subscription

Thanks for signing up for our newsletter!

Please confirm your email address by clicking the link below:
${confirmUrl}

Once confirmed, you'll receive:
- Exclusive deals and promotions
- New product announcements
- 10% off your first order

If you didn't sign up for this newsletter, you can safely ignore this email.

---
${EMAIL_CONFIG.APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
