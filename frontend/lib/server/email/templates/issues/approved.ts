import { COLORS, EMAIL_CONFIG, formatOrderId } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout } from '../../partials';
import { getButton } from '../../partials/button';

/**
 * Send approval notification to customer
 */
export async function sendIssueApprovedEmail(
  email: string,
  customerName: string,
  issueId: string,
  productName: string,
  resolutionType: 'REPRINT' | 'REFUND',
  adminMessage?: string
): Promise<boolean> {
  const issueUrl = `${EMAIL_CONFIG.APP_URL}/account/issues/${issueId}`;
  const resolutionText = resolutionType === 'REPRINT' ? 'a free replacement' : 'a refund';
  const subject = `Good news: Your issue has been approved - ${EMAIL_CONFIG.APP_NAME}`;

  const successBox = `
    <div style="background: ${COLORS.bgSuccess}; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; color: #065f46; font-size: 18px; font-weight: bold;">
        ${resolutionType === 'REPRINT' ? 'Replacement Approved' : 'Refund Approved'}
      </p>
    </div>
  `;

  const adminNote = adminMessage ? `
    <div style="background: ${COLORS.bgGray}; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: ${COLORS.textSecondary}; font-size: 14px;">${adminMessage}</p>
    </div>
  ` : '';

  const nextSteps = resolutionType === 'REPRINT'
    ? 'Your replacement order will be created and processed shortly.'
    : 'Your refund will be processed within 24 hours.';

  const content = `
    <h2 style="color: ${COLORS.textPrimary}; margin-top: 0;">Your Issue Has Been Approved!</h2>

    <p>Hi ${customerName},</p>

    <p>Great news! We've reviewed your issue with <strong>${productName}</strong> and approved it for ${resolutionText}.</p>

    ${successBox}

    ${adminNote}

    <p><strong>What happens next?</strong></p>
    <p style="color: ${COLORS.textSecondary};">${nextSteps}</p>

    ${getButton({ text: 'View Issue Details', url: issueUrl, color: COLORS.success })}
  `;

  const html = wrapInLayout({ header: { color: COLORS.success }, content });

  const text = `
Your Issue Has Been Approved!

Hi ${customerName},

Great news! We've reviewed your issue with ${productName} and approved it for ${resolutionText}.

${adminMessage ? `Note: ${adminMessage}\n` : ''}View details: ${issueUrl}

Issue ID: #${formatOrderId(issueId)}

---
${EMAIL_CONFIG.APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
