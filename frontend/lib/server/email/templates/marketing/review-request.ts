import { COLORS, EMAIL_CONFIG } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout, getDivider } from '../../partials';
import { getButton } from '../../partials/button';

/**
 * Send review request email after order is delivered
 */
export async function sendReviewRequestEmail(
  email: string,
  customerName: string,
  orderId: string,
  orderItems: { name: string; quantity: number }[]
): Promise<boolean> {
  const firstName = customerName.split(' ')[0];
  const reviewUrl = `${EMAIL_CONFIG.APP_URL}/orders/${orderId}?review=true`;
  const pointsReward = 50;

  const subject = `How was your order? Leave a review & earn ${pointsReward} points!`;

  // Build product list HTML
  const productListHtml = orderItems.slice(0, 3).map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid ${COLORS.border};">
        ${item.name} ${item.quantity > 1 ? `(x${item.quantity})` : ''}
      </td>
    </tr>
  `).join('');

  const moreItemsText = orderItems.length > 3
    ? `<p style="color: ${COLORS.textSecondary}; font-size: 14px;">+ ${orderItems.length - 3} more item${orderItems.length - 3 > 1 ? 's' : ''}</p>`
    : '';

  const orderSummary = `
    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px; font-weight: bold; color: #374151;">Your order included:</p>
      <table style="width: 100%; border-collapse: collapse;">
        ${productListHtml}
      </table>
      ${moreItemsText}
    </div>
  `;

  const pointsBox = `
    <div style="background: linear-gradient(135deg, ${COLORS.success} 0%, #059669 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
      <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Earn Loyalty Points</p>
      <p style="margin: 10px 0; font-size: 48px; font-weight: bold; color: white;">+${pointsReward}</p>
      <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 16px;">points when you leave a review</p>
      <p style="margin: 10px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">
        100 points = £1 off your next order
      </p>
    </div>
  `;

  const starRating = `
    <div style="text-align: center; margin: 30px 0;">
      <p style="color: ${COLORS.textSecondary}; margin-bottom: 15px;">How would you rate your experience?</p>
      <div style="font-size: 36px; letter-spacing: 8px;">
        &#11088; &#11088; &#11088; &#11088; &#11088;
      </div>
    </div>
  `;

  const content = `
    <h2 style="color: ${COLORS.textPrimary}; margin-top: 0; text-align: center;">
      Your order has arrived!
    </h2>

    <p>Hi ${firstName},</p>

    <p>We hope you're loving your order! We'd really appreciate it if you could take a moment to share your experience.</p>

    ${orderSummary}

    ${pointsBox}

    ${starRating}

    ${getButton({ text: `Leave a Review & Earn ${pointsReward} Points`, url: reviewUrl })}

    <p style="color: ${COLORS.textSecondary}; font-size: 14px; text-align: center;">
      It only takes a minute and helps other customers!
    </p>

    ${getDivider()}

    <p style="color: ${COLORS.textMuted}; font-size: 12px; margin-bottom: 0; text-align: center;">
      Thank you for shopping with ${EMAIL_CONFIG.APP_NAME}!
    </p>
  `;

  const html = wrapInLayout({ content });

  const productListText = orderItems.slice(0, 3).map(item =>
    `• ${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}`
  ).join('\n');

  const text = `
Your order has arrived!

Hi ${firstName},

We hope you're loving your order! We'd really appreciate it if you could take a moment to share your experience.

Your order included:
${productListText}
${orderItems.length > 3 ? `+ ${orderItems.length - 3} more items` : ''}

---

EARN ${pointsReward} LOYALTY POINTS
Leave a review and get ${pointsReward} points!
100 points = £1 off your next order

---

Leave your review here: ${reviewUrl}

It only takes a minute and helps other customers!

---
Thank you for shopping with ${EMAIL_CONFIG.APP_NAME}!
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
