import { COLORS, EMAIL_CONFIG, formatOrderId } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout } from '../../partials';
import { getButton } from '../../partials/button';

/**
 * Send info requested notification to customer
 */
export async function sendIssueInfoRequestedEmail(
  email: string,
  customerName: string,
  issueId: string,
  productName: string,
  adminMessage: string
): Promise<boolean> {
  const issueUrl = `${EMAIL_CONFIG.APP_URL}/account/issues/${issueId}`;
  const subject = `Action required: We need more information - ${EMAIL_CONFIG.APP_NAME}`;

  const warningBox = `
    <div style="background: ${COLORS.bgWarning}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${COLORS.warning};">
      <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: bold;">Message from our team:</p>
      <p style="margin: 10px 0 0; color: #92400e;">${adminMessage}</p>
    </div>
  `;

  const content = `
    <h2 style="color: ${COLORS.textPrimary}; margin-top: 0;">We Need More Information</h2>

    <p>Hi ${customerName},</p>

    <p>To help resolve your issue with <strong>${productName}</strong>, we need some additional information from you.</p>

    ${warningBox}

    ${getButton({ text: 'Respond Now', url: issueUrl, color: COLORS.warning })}

    <p style="color: ${COLORS.textSecondary}; font-size: 14px;">Please respond as soon as possible so we can continue processing your issue.</p>
  `;

  const html = wrapInLayout({ header: { color: COLORS.warning }, content });

  const text = `
We Need More Information

Hi ${customerName},

To help resolve your issue with ${productName}, we need some additional information from you.

Message from our team:
${adminMessage}

Please respond at: ${issueUrl}

Issue ID: #${formatOrderId(issueId)}

---
${EMAIL_CONFIG.APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
