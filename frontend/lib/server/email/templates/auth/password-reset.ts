import { EMAIL_CONFIG } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout, getDivider, getMutedText } from '../../partials';
import { getButton, getFallbackLink } from '../../partials/button';

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${EMAIL_CONFIG.APP_URL}/auth/reset-password?token=${resetToken}`;
  const subject = `Reset your ${EMAIL_CONFIG.APP_NAME} password`;

  const content = `
    <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>

    <p>Hi ${name},</p>

    <p>We received a request to reset your password for your ${EMAIL_CONFIG.APP_NAME} account. Click the button below to create a new password:</p>

    ${getButton({ text: 'Reset Password', url: resetUrl })}

    ${getMutedText('This link will expire in 1 hour for security reasons.')}

    ${getMutedText("If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.")}

    ${getDivider()}

    ${getFallbackLink(resetUrl)}
  `;

  const html = wrapInLayout({ content });

  const text = `
Reset Your Password

Hi ${name},

We received a request to reset your password for your ${EMAIL_CONFIG.APP_NAME} account.

Click the link below to create a new password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

---
${EMAIL_CONFIG.APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
