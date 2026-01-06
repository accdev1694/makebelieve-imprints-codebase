import { COLORS, EMAIL_CONFIG } from '../../config';
import { sendEmail } from '../../send';
import { wrapInLayout, getDivider } from '../../partials';
import { getButton } from '../../partials/button';

interface RecoveryEmailItem {
  productId: string;
  productName: string;
  productImage: string;
  price: number;
}

interface RecoveryEmailOptions {
  to: string;
  firstName: string;
  type: 'CART' | 'WISHLIST';
  items: RecoveryEmailItem[];
  promoCode: string;
  discountPercent: number;
  daysLeft: number;
}

/**
 * Send recovery email for abandoned cart or wishlist
 */
export async function sendRecoveryEmail({
  to,
  firstName,
  type,
  items,
  promoCode,
  discountPercent,
  daysLeft,
}: RecoveryEmailOptions): Promise<boolean> {
  const isCart = type === 'CART';
  const actionUrl = isCart ? `${EMAIL_CONFIG.APP_URL}/cart` : `${EMAIL_CONFIG.APP_URL}/account/wishlist`;
  const itemLabel = isCart ? 'cart' : 'wishlist';

  const subject = isCart
    ? `Your cart is waiting! Here's ${discountPercent}% off`
    : `Items you love are still waiting! Get ${discountPercent}% off`;

  // Build product list HTML (max 5 items)
  const productListHtml = items.slice(0, 5).map((item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid ${COLORS.border};">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 80px; vertical-align: top;">
              <img src="${item.productImage}" alt="${item.productName}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px;">
            </td>
            <td style="vertical-align: top; padding-left: 12px;">
              <p style="margin: 0; font-weight: 500; color: ${COLORS.textPrimary};">${item.productName}</p>
              <p style="margin: 5px 0 0; color: ${COLORS.primary}; font-weight: bold;">£${item.price.toFixed(2)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  const moreItemsText = items.length > 5 ? `<p style="color: ${COLORS.textSecondary}; font-size: 14px; text-align: center;">+ ${items.length - 5} more item${items.length - 5 > 1 ? 's' : ''}</p>` : '';

  const promoBox = `
    <div style="background: linear-gradient(135deg, ${COLORS.primary} 0%, #4f46e5 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
      <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Exclusive Discount Code</p>
      <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: white; letter-spacing: 3px;">${promoCode}</p>
      <p style="margin: 0; color: white; font-size: 20px; font-weight: bold;">${discountPercent}% OFF</p>
      <p style="margin: 10px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">
        Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}
      </p>
    </div>
  `;

  const content = `
    <h2 style="color: ${COLORS.textPrimary}; margin-top: 0;">
      ${isCart ? 'You left something behind!' : 'Still thinking about these?'}
    </h2>

    <p>Hi ${firstName},</p>

    <p>
      ${isCart
        ? "We noticed you have items waiting in your cart. Don't let them slip away!"
        : "Those items in your wishlist are calling your name. Now's the perfect time to treat yourself!"}
    </p>

    <!-- Product List -->
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f9fafb; border-radius: 8px;">
      ${productListHtml}
    </table>
    ${moreItemsText}

    ${promoBox}

    ${getButton({ text: isCart ? 'Complete Your Order' : 'Shop Your Wishlist', url: actionUrl })}

    <p style="color: ${COLORS.textSecondary}; font-size: 14px; text-align: center;">
      Enter code <strong>${promoCode}</strong> at checkout to save ${discountPercent}%
    </p>

    ${getDivider()}

    <p style="color: ${COLORS.textMuted}; font-size: 12px; margin-bottom: 0; text-align: center;">
      You're receiving this because you have items in your ${itemLabel}.
      <br>
      <a href="${EMAIL_CONFIG.APP_URL}/account/preferences" style="color: ${COLORS.textMuted};">Manage email preferences</a>
    </p>
  `;

  const html = wrapInLayout({ content });

  const productListText = items.slice(0, 5).map((item) =>
    `• ${item.productName} - £${item.price.toFixed(2)}`
  ).join('\n');

  const text = `
${isCart ? 'You left something behind!' : 'Still thinking about these?'}

Hi ${firstName},

${isCart
  ? "We noticed you have items waiting in your cart. Don't let them slip away!"
  : "Those items in your wishlist are calling your name. Now's the perfect time to treat yourself!"}

Your items:
${productListText}
${items.length > 5 ? `+ ${items.length - 5} more items` : ''}

---

EXCLUSIVE DISCOUNT CODE: ${promoCode}
${discountPercent}% OFF your order
Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}

---

${isCart ? 'Complete your order' : 'Shop your wishlist'}: ${actionUrl}

Enter code ${promoCode} at checkout to save ${discountPercent}%!

---
${EMAIL_CONFIG.APP_NAME}
  `.trim();

  return sendEmail({ to, subject, html, text });
}
