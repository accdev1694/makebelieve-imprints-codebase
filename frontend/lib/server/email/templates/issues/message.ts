import { COLORS, EMAIL_CONFIG, formatOrderId, truncateText } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout } from '../../partials';
import { getButton } from '../../partials/button';

/**
 * Send new message notification
 */
export async function sendIssueMessageEmail(
  email: string,
  recipientName: string,
  issueId: string,
  senderType: 'customer' | 'admin',
  messagePreview: string
): Promise<boolean> {
  const issueUrl = senderType === 'customer'
    ? `${EMAIL_CONFIG.APP_URL}/admin/issues/${issueId}`
    : `${EMAIL_CONFIG.APP_URL}/account/issues/${issueId}`;

  const subject = `New message on your issue - ${EMAIL_CONFIG.APP_NAME}`;

  const messageBox = `
    <div style="background: ${COLORS.bgGray}; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #4b5563; font-style: italic;">"${truncateText(messagePreview, 200)}"</p>
    </div>
  `;

  const content = `
    <h2 style="color: ${COLORS.textPrimary}; margin-top: 0;">New Message</h2>

    <p>Hi ${recipientName},</p>

    <p>You have a new message regarding issue #${formatOrderId(issueId)}:</p>

    ${messageBox}

    ${getButton({ text: 'View & Reply', url: issueUrl })}
  `;

  const html = wrapInLayout({ content });

  const text = `
New Message

Hi ${recipientName},

You have a new message regarding issue #${formatOrderId(issueId)}:

"${messagePreview}"

View and reply: ${issueUrl}

---
${EMAIL_CONFIG.APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
