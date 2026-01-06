import { COLORS, EMAIL_CONFIG, formatOrderId } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout } from '../../partials';
import { getButton } from '../../partials/button';

const reasonLabels: Record<string, string> = {
  DAMAGED_IN_TRANSIT: 'Damaged in Transit',
  QUALITY_ISSUE: 'Quality Issue',
  WRONG_ITEM: 'Wrong Item Sent',
  PRINTING_ERROR: 'Printing Error',
  NEVER_ARRIVED: 'Never Arrived',
  OTHER: 'Other',
};

/**
 * Send issue received confirmation to customer
 */
export async function sendIssueReceivedEmail(
  email: string,
  customerName: string,
  issueId: string,
  productName: string,
  reason: string
): Promise<boolean> {
  const issueUrl = `${EMAIL_CONFIG.APP_URL}/account/issues/${issueId}`;
  const reasonText = reasonLabels[reason] || reason;
  const subject = `We've received your issue report - ${EMAIL_CONFIG.APP_NAME}`;

  const infoBox = `
    <div style="background: ${COLORS.bgGray}; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 14px;">Issue ID: <strong>#${formatOrderId(issueId)}</strong></p>
      <p style="margin: 10px 0 0; color: ${COLORS.textSecondary}; font-size: 14px;">Product: <strong>${productName}</strong></p>
      <p style="margin: 10px 0 0; color: ${COLORS.textSecondary}; font-size: 14px;">Reason: <strong>${reasonText}</strong></p>
    </div>
  `;

  const content = `
    <h2 style="color: #1f2937; margin-top: 0;">Issue Report Received</h2>

    <p>Hi ${customerName},</p>

    <p>We've received your issue report and our team is reviewing it.</p>

    ${infoBox}

    <p><strong>What happens next?</strong></p>
    <ul style="color: ${COLORS.textSecondary};">
      <li>Our team will review your issue within 1-2 business days</li>
      <li>We may reach out if we need additional information</li>
      <li>You'll receive updates via email as your issue progresses</li>
    </ul>

    ${getButton({ text: 'View Issue Status', url: issueUrl })}
  `;

  const html = wrapInLayout({ content });

  const text = `
Issue Report Received

Hi ${customerName},

We've received your issue report and our team is reviewing it.

Issue ID: #${formatOrderId(issueId)}
Product: ${productName}
Reason: ${reasonText}

What happens next?
- Our team will review your issue within 1-2 business days
- We may reach out if we need additional information
- You'll receive updates via email as your issue progresses

View your issue: ${issueUrl}

---
${EMAIL_CONFIG.APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
