import { COLORS, EMAIL_CONFIG, formatOrderId } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout } from '../../partials';
import { getButton } from '../../partials/button';

/**
 * Send rejection notification to customer
 */
export async function sendIssueRejectedEmail(
  email: string,
  customerName: string,
  issueId: string,
  productName: string,
  rejectionReason: string,
  canAppeal: boolean
): Promise<boolean> {
  const issueUrl = `${EMAIL_CONFIG.APP_URL}/account/issues/${issueId}`;
  const subject = `Update on your issue report - ${EMAIL_CONFIG.APP_NAME}`;

  const dangerBox = `
    <div style="background: ${COLORS.bgDanger}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${COLORS.danger};">
      <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: bold;">Reason:</p>
      <p style="margin: 10px 0 0; color: #991b1b;">${rejectionReason}</p>
    </div>
  `;

  const appealSection = canAppeal
    ? `
      <p>If you believe this decision was made in error, you can appeal by providing additional information.</p>
      ${getButton({ text: 'Appeal This Decision', url: issueUrl })}
    `
    : '<p style="color: #6b7280;">This decision is final.</p>';

  const content = `
    <h2 style="color: ${COLORS.textPrimary}; margin-top: 0;">Issue Update</h2>

    <p>Hi ${customerName},</p>

    <p>We've reviewed your issue with <strong>${productName}</strong>, and unfortunately we're unable to approve a replacement or refund at this time.</p>

    ${dangerBox}

    ${appealSection}
  `;

  const html = wrapInLayout({ content });

  const text = `
Issue Update

Hi ${customerName},

We've reviewed your issue with ${productName}, and unfortunately we're unable to approve a replacement or refund at this time.

Reason: ${rejectionReason}

${canAppeal ? `If you believe this decision was made in error, you can appeal at: ${issueUrl}` : 'This decision is final.'}

Issue ID: #${formatOrderId(issueId)}

---
${EMAIL_CONFIG.APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
