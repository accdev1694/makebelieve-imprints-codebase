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
 * Send admin alert for new issue
 */
export async function sendAdminNewIssueAlert(
  adminEmail: string,
  issueId: string,
  customerName: string,
  customerEmail: string,
  productName: string,
  reason: string,
  orderId: string
): Promise<boolean> {
  const issueUrl = `${EMAIL_CONFIG.APP_URL}/admin/issues/${issueId}`;
  const reasonText = reasonLabels[reason] || reason;
  const subject = `[ACTION REQUIRED] New Issue Report - ${customerName}`;

  const infoTable = `
    <div style="background: ${COLORS.bgGray}; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 5px 0; color: ${COLORS.textSecondary};">Issue ID:</td>
          <td style="padding: 5px 0; font-weight: bold;">#${formatOrderId(issueId)}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: ${COLORS.textSecondary};">Customer:</td>
          <td style="padding: 5px 0; font-weight: bold;">${customerName}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: ${COLORS.textSecondary};">Email:</td>
          <td style="padding: 5px 0;">${customerEmail}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: ${COLORS.textSecondary};">Order:</td>
          <td style="padding: 5px 0; font-family: monospace;">${formatOrderId(orderId)}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: ${COLORS.textSecondary};">Product:</td>
          <td style="padding: 5px 0;">${productName}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: ${COLORS.textSecondary};">Reason:</td>
          <td style="padding: 5px 0; font-weight: bold; color: ${COLORS.danger};">${reasonText}</td>
        </tr>
      </table>
    </div>
  `;

  const content = `
    <h2 style="color: ${COLORS.textPrimary}; margin-top: 0;">New Issue Requires Review</h2>

    ${infoTable}

    ${getButton({ text: 'Review Issue Now', url: issueUrl, color: COLORS.danger })}
  `;

  const html = wrapInLayout({ header: { color: COLORS.danger, title: 'New Issue Alert' }, content });

  const text = `
New Issue Alert

Issue ID: #${formatOrderId(issueId)}
Customer: ${customerName} (${customerEmail})
Order: ${formatOrderId(orderId)}
Product: ${productName}
Reason: ${reasonText}

Review issue: ${issueUrl}

---
${EMAIL_CONFIG.APP_NAME} Admin Alert
  `.trim();

  return sendEmail({ to: adminEmail, subject, html, text });
}
