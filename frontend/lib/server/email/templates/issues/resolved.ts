import { COLORS, EMAIL_CONFIG, formatOrderId, formatCurrency } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout } from '../../partials';
import { getButton } from '../../partials/button';

/**
 * Send issue resolved notification to customer
 */
export async function sendIssueResolvedEmail(
  email: string,
  customerName: string,
  issueId: string,
  productName: string,
  resolutionType: 'REPRINT' | 'FULL_REFUND' | 'PARTIAL_REFUND',
  details: { reprintOrderId?: string; refundAmount?: number }
): Promise<boolean> {
  const issueUrl = `${EMAIL_CONFIG.APP_URL}/account/issues/${issueId}`;
  const subject = `Your issue has been resolved - ${EMAIL_CONFIG.APP_NAME}`;

  let resolutionDetails = '';
  if (resolutionType === 'REPRINT' && details.reprintOrderId) {
    resolutionDetails = `Your replacement order #${formatOrderId(details.reprintOrderId)} has been created.`;
  } else if (details.refundAmount) {
    resolutionDetails = `A ${resolutionType === 'FULL_REFUND' ? 'full' : 'partial'} refund of ${formatCurrency(details.refundAmount)} has been processed.`;
  }

  const successBox = `
    <div style="background: ${COLORS.bgSuccess}; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; color: #065f46; font-size: 16px; font-weight: bold;">
        ${resolutionDetails}
      </p>
    </div>
  `;

  const nextStepsText = resolutionType === 'REPRINT'
    ? '<p style="color: #6b7280;">Your replacement order will be printed and shipped shortly.</p>'
    : '<p style="color: #6b7280;">Your refund should appear in your account within 5-10 business days.</p>';

  const content = `
    <h2 style="color: ${COLORS.textPrimary}; margin-top: 0;">Issue Resolved</h2>

    <p>Hi ${customerName},</p>

    <p>Your issue with <strong>${productName}</strong> has been resolved.</p>

    ${successBox}

    ${nextStepsText}

    ${getButton({ text: 'View Issue Details', url: issueUrl, color: COLORS.success })}

    <p>Thank you for your patience!</p>
  `;

  const html = wrapInLayout({ header: { color: COLORS.success }, content });

  const text = `
Issue Resolved

Hi ${customerName},

Your issue with ${productName} has been resolved.

${resolutionDetails}

View details: ${issueUrl}

Thank you for your patience!

Issue ID: #${formatOrderId(issueId)}

---
${EMAIL_CONFIG.APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
