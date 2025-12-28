import { Resend } from 'resend';

// Lazy initialization of Resend client
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

// Email configuration
const FROM_EMAIL = process.env.EMAIL_FROM || 'MakeBelieve Imprints <noreply@makebelieveimprints.co.uk>';
const APP_NAME = 'MakeBelieve Imprints';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://makebelieveimprints.co.uk';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<boolean> {
  try {
    const resend = getResendClient();
    console.log('Sending email to:', to, 'from:', FROM_EMAIL);

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error('Resend API error:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log('Email sent successfully, ID:', data?.id);
    return true;
  } catch (error) {
    console.error('Exception sending email:', error);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${APP_URL}/auth/reset-password?token=${resetToken}`;

  const subject = `Reset your ${APP_NAME} password`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>

        <p>Hi ${name},</p>

        <p>We received a request to reset your password for your ${APP_NAME} account. Click the button below to create a new password:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>

        <p style="color: #6b7280; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
          If the button doesn't work, copy and paste this link into your browser:
          <br>
          <a href="${resetUrl}" style="color: #6366f1; word-break: break-all;">${resetUrl}</a>
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Reset Your Password

Hi ${name},

We received a request to reset your password for your ${APP_NAME} account.

Click the link below to create a new password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

---
${APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}

/**
 * Send subscription confirmation email (double opt-in)
 */
export async function sendSubscriptionConfirmEmail(
  email: string,
  confirmToken: string
): Promise<boolean> {
  const confirmUrl = `${APP_URL}/subscribe/confirm?token=${confirmToken}`;

  const subject = `Confirm your subscription to ${APP_NAME}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">Confirm Your Subscription</h2>

        <p>Thanks for signing up for our newsletter!</p>

        <p>Please confirm your email address by clicking the button below:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmUrl}" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Confirm Subscription
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">Once confirmed, you'll receive:</p>
        <ul style="color: #6b7280; font-size: 14px;">
          <li>Exclusive deals and promotions</li>
          <li>New product announcements</li>
          <li>10% off your first order</li>
        </ul>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
          If you didn't sign up for this newsletter, you can safely ignore this email.
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Confirm Your Subscription

Thanks for signing up for our newsletter!

Please confirm your email address by clicking the link below:
${confirmUrl}

Once confirmed, you'll receive:
- Exclusive deals and promotions
- New product announcements
- 10% off your first order

If you didn't sign up for this newsletter, you can safely ignore this email.

---
${APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}

/**
 * Send welcome email after subscription is confirmed
 */
export async function sendWelcomeEmail(email: string): Promise<boolean> {
  const shopUrl = `${APP_URL}/products`;
  const unsubscribeUrl = `${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}`;

  const subject = `Welcome to ${APP_NAME}! Here's your 10% discount`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">Welcome to the Family!</h2>

        <p>Your subscription is now confirmed. Thank you for joining us!</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Your exclusive discount code:</p>
          <p style="margin: 10px 0 0; font-size: 28px; font-weight: bold; color: #6366f1; letter-spacing: 2px;">WELCOME10</p>
          <p style="margin: 5px 0 0; color: #6b7280; font-size: 12px;">Use at checkout for 10% off your first order</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${shopUrl}" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Start Shopping
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          <a href="${unsubscribeUrl}" style="color: #9ca3af;">Unsubscribe</a>
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to the Family!

Your subscription is now confirmed. Thank you for joining us!

Your exclusive discount code: WELCOME10
Use at checkout for 10% off your first order

Start shopping: ${shopUrl}

---
To unsubscribe: ${unsubscribeUrl}

${APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}

/**
 * Send reprint confirmation email
 */
export async function sendReprintConfirmationEmail(
  email: string,
  customerName: string,
  originalOrderId: string,
  reprintOrderId: string,
  reason: string
): Promise<boolean> {
  const orderUrl = `${APP_URL}/account/orders/${reprintOrderId}`;

  const reasonLabels: Record<string, string> = {
    DAMAGED_IN_TRANSIT: 'damaged during delivery',
    QUALITY_ISSUE: 'quality issue',
    WRONG_ITEM: 'wrong item sent',
    PRINTING_ERROR: 'printing error',
    OTHER: 'issue with your order',
  };

  const reasonText = reasonLabels[reason] || 'issue with your order';

  const subject = `Your replacement order is being processed - ${APP_NAME}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">Replacement Order Confirmed</h2>

        <p>Hi ${customerName},</p>

        <p>We're sorry to hear about the ${reasonText}. We've created a replacement order for you at no additional cost.</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Original Order: <strong>${originalOrderId.slice(0, 8).toUpperCase()}</strong></p>
          <p style="margin: 10px 0 0; color: #6b7280; font-size: 14px;">Replacement Order: <strong>${reprintOrderId.slice(0, 8).toUpperCase()}</strong></p>
        </div>

        <p>Your replacement order is now being processed and will be dispatched soon. You'll receive tracking information once it ships.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${orderUrl}" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            View Replacement Order
          </a>
        </div>

        <p>Thank you for your patience and understanding. We're committed to making things right!</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
          If you have any questions, please reply to this email or contact us at support@makebelieveimprints.co.uk
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Replacement Order Confirmed

Hi ${customerName},

We're sorry to hear about the ${reasonText}. We've created a replacement order for you at no additional cost.

Original Order: ${originalOrderId.slice(0, 8).toUpperCase()}
Replacement Order: ${reprintOrderId.slice(0, 8).toUpperCase()}

Your replacement order is now being processed and will be dispatched soon. You'll receive tracking information once it ships.

View your order: ${orderUrl}

Thank you for your patience and understanding. We're committed to making things right!

If you have any questions, please reply to this email or contact us at support@makebelieveimprints.co.uk

---
${APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}

/**
 * Send refund confirmation email
 */
export async function sendRefundConfirmationEmail(
  email: string,
  customerName: string,
  orderId: string,
  amount: number,
  reason: string
): Promise<boolean> {
  const reasonLabels: Record<string, string> = {
    DAMAGED_IN_TRANSIT: 'damaged during delivery',
    QUALITY_ISSUE: 'quality issue',
    WRONG_ITEM: 'wrong item sent',
    PRINTING_ERROR: 'printing error',
    OTHER: 'issue with your order',
  };

  const reasonText = reasonLabels[reason] || 'issue with your order';
  const formattedAmount = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);

  const subject = `Your refund has been processed - ${APP_NAME}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">Refund Processed</h2>

        <p>Hi ${customerName},</p>

        <p>We're sorry to hear about the ${reasonText}. We've processed a full refund for your order.</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Order: <strong>${orderId.slice(0, 8).toUpperCase()}</strong></p>
          <p style="margin: 10px 0 0; font-size: 24px; font-weight: bold; color: #059669;">Refund Amount: ${formattedAmount}</p>
        </div>

        <p>The refund will be credited to your original payment method. Please allow 5-10 business days for the refund to appear on your statement, depending on your bank.</p>

        <p>We apologise for any inconvenience caused. We value your business and hope to serve you again in the future.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
          If you have any questions, please reply to this email or contact us at support@makebelieveimprints.co.uk
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Refund Processed

Hi ${customerName},

We're sorry to hear about the ${reasonText}. We've processed a full refund for your order.

Order: ${orderId.slice(0, 8).toUpperCase()}
Refund Amount: ${formattedAmount}

The refund will be credited to your original payment method. Please allow 5-10 business days for the refund to appear on your statement, depending on your bank.

We apologise for any inconvenience caused. We value your business and hope to serve you again in the future.

If you have any questions, please reply to this email or contact us at support@makebelieveimprints.co.uk

---
${APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
