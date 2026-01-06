import { COLORS, EMAIL_CONFIG, formatOrderId } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout, getDivider, getMutedText } from '../../partials';
import { getButton } from '../../partials/button';

/**
 * Send issue concluded notification to customer
 */
export async function sendIssueConcludedEmail(
  email: string,
  customerName: string,
  issueId: string,
  productName: string,
  concludedReason: string,
  finalStatus: string
): Promise<boolean> {
  const issueUrl = `${EMAIL_CONFIG.APP_URL}/account/issues/${issueId}`;

  // Map final status to user-friendly text
  const statusLabels: Record<string, string> = {
    COMPLETED: 'resolved',
    REJECTED: 'reviewed and closed',
    CLOSED: 'closed',
  };
  const statusText = statusLabels[finalStatus] || 'concluded';

  const subject = `Your issue has been ${statusText} - ${EMAIL_CONFIG.APP_NAME}`;

  const infoBox = `
    <div style="background: ${COLORS.bgGray}; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 14px;">Issue ID: <strong>#${formatOrderId(issueId)}</strong></p>
      <p style="margin: 10px 0 0; color: ${COLORS.textSecondary}; font-size: 14px;">Product: <strong>${productName}</strong></p>
      <p style="margin: 10px 0 0; color: ${COLORS.textSecondary}; font-size: 14px;">Status: <strong>Concluded</strong></p>
    </div>
  `;

  const noteSection = concludedReason ? `
    <div style="background: ${COLORS.bgGray}; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 14px;"><strong>Note from our team:</strong></p>
      <p style="margin: 10px 0 0; color: #4b5563;">${concludedReason}</p>
    </div>
  ` : '';

  const content = `
    <h2 style="color: ${COLORS.textPrimary}; margin-top: 0;">Issue Concluded</h2>

    <p>Hi ${customerName},</p>

    <p>Your issue regarding <strong>${productName}</strong> has been ${statusText} and is now concluded.</p>

    ${infoBox}

    ${noteSection}

    <p style="color: ${COLORS.textSecondary};">This issue is now closed and no further action is required. You can still view the full conversation history for your records.</p>

    ${getButton({ text: 'View Issue Details', url: issueUrl })}

    <p>Thank you for your patience throughout this process.</p>

    ${getDivider()}

    ${getMutedText(`If you have any questions, please contact us at ${EMAIL_CONFIG.SUPPORT_EMAIL}`)}
  `;

  const html = wrapInLayout({ content });

  const text = `
Issue Concluded

Hi ${customerName},

Your issue regarding ${productName} has been ${statusText} and is now concluded.

Issue ID: #${formatOrderId(issueId)}
Product: ${productName}
Status: Concluded

${concludedReason ? `Note from our team: ${concludedReason}` : ''}

This issue is now closed and no further action is required. You can still view the full conversation history for your records.

View issue details: ${issueUrl}

Thank you for your patience throughout this process.

If you have any questions, please contact us at ${EMAIL_CONFIG.SUPPORT_EMAIL}

---
${EMAIL_CONFIG.APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
