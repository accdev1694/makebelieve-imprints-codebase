import { COLORS, EMAIL_CONFIG, formatOrderId, formatCurrency } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout } from '../../partials';
import { getButton } from '../../partials/button';

const CANCELLATION_REASON_LABELS: Record<string, string> = {
  OUT_OF_STOCK: 'Item out of stock',
  BUYER_REQUEST: 'Customer request',
  FRAUD_SUSPECTED: 'Payment verification issue',
  PAYMENT_ISSUE: 'Payment processing issue',
  PRODUCTION_ISSUE: 'Production issue',
  DUPLICATE_ORDER: 'Duplicate order',
  OTHER: 'Other',
};

/**
 * Send admin alert for new cancellation request
 */
export async function sendAdminCancellationRequestAlert(
  adminEmail: string,
  orderId: string,
  customerName: string,
  customerEmail: string,
  reason: string,
  notes: string | null,
  orderTotal: number
): Promise<boolean> {
  const orderUrl = `${EMAIL_CONFIG.APP_URL}/admin/orders/${orderId}`;
  const reasonText = CANCELLATION_REASON_LABELS[reason] || reason;
  const formattedTotal = formatCurrency(orderTotal);
  const subject = `[ACTION REQUIRED] Cancellation Request - Order #${formatOrderId(orderId)}`;

  const infoTable = `
    <div style="background: ${COLORS.bgGray}; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 5px 0; color: ${COLORS.textSecondary};">Order:</td>
          <td style="padding: 5px 0; font-weight: bold;">#${formatOrderId(orderId)}</td>
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
          <td style="padding: 5px 0; color: ${COLORS.textSecondary};">Order Total:</td>
          <td style="padding: 5px 0; font-weight: bold; color: ${COLORS.success};">${formattedTotal}</td>
        </tr>
        <tr>
          <td style="padding: 5px 0; color: ${COLORS.textSecondary};">Reason:</td>
          <td style="padding: 5px 0; font-weight: bold; color: ${COLORS.warning};">${reasonText}</td>
        </tr>
      </table>
    </div>
  `;

  const notesSection = notes ? `
    <div style="background: ${COLORS.bgWarning}; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${COLORS.warning};">
      <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Customer's notes:</strong></p>
      <p style="margin: 10px 0 0; color: #92400e;">${notes}</p>
    </div>
  ` : '';

  const content = `
    <h2 style="color: ${COLORS.textPrimary}; margin-top: 0;">Customer Wants to Cancel</h2>

    ${infoTable}

    ${notesSection}

    ${getButton({ text: 'Review & Respond', url: orderUrl, color: COLORS.warning })}
  `;

  const html = wrapInLayout({ header: { color: COLORS.warning, title: 'Cancellation Request' }, content });

  const text = `
Cancellation Request

Order: #${formatOrderId(orderId)}
Customer: ${customerName} (${customerEmail})
Order Total: ${formattedTotal}
Reason: ${reasonText}
${notes ? `Customer's notes: ${notes}` : ''}

Review and respond: ${orderUrl}

---
${EMAIL_CONFIG.APP_NAME} Admin Alert
  `.trim();

  return sendEmail({ to: adminEmail, subject, html, text });
}
