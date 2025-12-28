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

// ============================================
// Issue System Email Templates
// ============================================

/**
 * Send issue received confirmation to customer
 */
export async function sendIssueReceivedEmail(
  email: string,
  customerName: string,
  issueId: string,
  productName: string,
  reason: string
): Promise<boolean> {
  const issueUrl = `${APP_URL}/account/issues/${issueId}`;

  const reasonLabels: Record<string, string> = {
    DAMAGED_IN_TRANSIT: 'Damaged in Transit',
    QUALITY_ISSUE: 'Quality Issue',
    WRONG_ITEM: 'Wrong Item Sent',
    PRINTING_ERROR: 'Printing Error',
    NEVER_ARRIVED: 'Never Arrived',
    OTHER: 'Other',
  };

  const reasonText = reasonLabels[reason] || reason;

  const subject = `We've received your issue report - ${APP_NAME}`;

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
        <h2 style="color: #1f2937; margin-top: 0;">Issue Report Received</h2>

        <p>Hi ${customerName},</p>

        <p>We've received your issue report and our team is reviewing it.</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Issue ID: <strong>#${issueId.slice(0, 8).toUpperCase()}</strong></p>
          <p style="margin: 10px 0 0; color: #6b7280; font-size: 14px;">Product: <strong>${productName}</strong></p>
          <p style="margin: 10px 0 0; color: #6b7280; font-size: 14px;">Reason: <strong>${reasonText}</strong></p>
        </div>

        <p><strong>What happens next?</strong></p>
        <ul style="color: #6b7280;">
          <li>Our team will review your issue within 1-2 business days</li>
          <li>We may reach out if we need additional information</li>
          <li>You'll receive updates via email as your issue progresses</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${issueUrl}" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            View Issue Status
          </a>
        </div>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Issue Report Received

Hi ${customerName},

We've received your issue report and our team is reviewing it.

Issue ID: #${issueId.slice(0, 8).toUpperCase()}
Product: ${productName}
Reason: ${reasonText}

What happens next?
- Our team will review your issue within 1-2 business days
- We may reach out if we need additional information
- You'll receive updates via email as your issue progresses

View your issue: ${issueUrl}

---
${APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}

/**
 * Send info requested notification to customer
 */
export async function sendIssueInfoRequestedEmail(
  email: string,
  customerName: string,
  issueId: string,
  productName: string,
  adminMessage: string
): Promise<boolean> {
  const issueUrl = `${APP_URL}/account/issues/${issueId}`;

  const subject = `Action required: We need more information - ${APP_NAME}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">We Need More Information</h2>

        <p>Hi ${customerName},</p>

        <p>To help resolve your issue with <strong>${productName}</strong>, we need some additional information from you.</p>

        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: bold;">Message from our team:</p>
          <p style="margin: 10px 0 0; color: #92400e;">${adminMessage}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${issueUrl}" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Respond Now
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">Please respond as soon as possible so we can continue processing your issue.</p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
We Need More Information

Hi ${customerName},

To help resolve your issue with ${productName}, we need some additional information from you.

Message from our team:
${adminMessage}

Please respond at: ${issueUrl}

Issue ID: #${issueId.slice(0, 8).toUpperCase()}

---
${APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}

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
  const issueUrl = `${APP_URL}/account/issues/${issueId}`;
  const resolutionText = resolutionType === 'REPRINT' ? 'a free replacement' : 'a refund';

  const subject = `Good news: Your issue has been approved - ${APP_NAME}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">Your Issue Has Been Approved!</h2>

        <p>Hi ${customerName},</p>

        <p>Great news! We've reviewed your issue with <strong>${productName}</strong> and approved it for ${resolutionText}.</p>

        <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: #065f46; font-size: 18px; font-weight: bold;">
            ${resolutionType === 'REPRINT' ? 'Replacement Approved' : 'Refund Approved'}
          </p>
        </div>

        ${adminMessage ? `
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">${adminMessage}</p>
        </div>
        ` : ''}

        <p><strong>What happens next?</strong></p>
        <p style="color: #6b7280;">
          ${resolutionType === 'REPRINT'
            ? 'Your replacement order will be created and processed shortly.'
            : 'Your refund will be processed within 24 hours.'}
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${issueUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            View Issue Details
          </a>
        </div>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Your Issue Has Been Approved!

Hi ${customerName},

Great news! We've reviewed your issue with ${productName} and approved it for ${resolutionText}.

${adminMessage ? `Note: ${adminMessage}\n` : ''}
View details: ${issueUrl}

Issue ID: #${issueId.slice(0, 8).toUpperCase()}

---
${APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}

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
  const issueUrl = `${APP_URL}/account/issues/${issueId}`;

  const subject = `Update on your issue report - ${APP_NAME}`;

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
        <h2 style="color: #1f2937; margin-top: 0;">Issue Update</h2>

        <p>Hi ${customerName},</p>

        <p>We've reviewed your issue with <strong>${productName}</strong>, and unfortunately we're unable to approve a replacement or refund at this time.</p>

        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: bold;">Reason:</p>
          <p style="margin: 10px 0 0; color: #991b1b;">${rejectionReason}</p>
        </div>

        ${canAppeal ? `
        <p>If you believe this decision was made in error, you can appeal by providing additional information.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${issueUrl}" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Appeal This Decision
          </a>
        </div>
        ` : '<p style="color: #6b7280;">This decision is final.</p>'}
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Issue Update

Hi ${customerName},

We've reviewed your issue with ${productName}, and unfortunately we're unable to approve a replacement or refund at this time.

Reason: ${rejectionReason}

${canAppeal ? `If you believe this decision was made in error, you can appeal at: ${issueUrl}` : 'This decision is final.'}

Issue ID: #${issueId.slice(0, 8).toUpperCase()}

---
${APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}

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
    ? `${APP_URL}/admin/issues/${issueId}`
    : `${APP_URL}/account/issues/${issueId}`;

  const subject = `New message on your issue - ${APP_NAME}`;

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
        <h2 style="color: #1f2937; margin-top: 0;">New Message</h2>

        <p>Hi ${recipientName},</p>

        <p>You have a new message regarding issue #${issueId.slice(0, 8).toUpperCase()}:</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #4b5563; font-style: italic;">"${messagePreview.length > 200 ? messagePreview.slice(0, 200) + '...' : messagePreview}"</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${issueUrl}" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            View & Reply
          </a>
        </div>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
New Message

Hi ${recipientName},

You have a new message regarding issue #${issueId.slice(0, 8).toUpperCase()}:

"${messagePreview}"

View and reply: ${issueUrl}

---
${APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}

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
  const issueUrl = `${APP_URL}/account/issues/${issueId}`;

  let resolutionDetails = '';
  if (resolutionType === 'REPRINT' && details.reprintOrderId) {
    resolutionDetails = `Your replacement order #${details.reprintOrderId.slice(0, 8).toUpperCase()} has been created.`;
  } else if (details.refundAmount) {
    const formattedAmount = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(details.refundAmount);
    resolutionDetails = `A ${resolutionType === 'FULL_REFUND' ? 'full' : 'partial'} refund of ${formattedAmount} has been processed.`;
  }

  const subject = `Your issue has been resolved - ${APP_NAME}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">Issue Resolved</h2>

        <p>Hi ${customerName},</p>

        <p>Your issue with <strong>${productName}</strong> has been resolved.</p>

        <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: #065f46; font-size: 16px; font-weight: bold;">
            ${resolutionDetails}
          </p>
        </div>

        ${resolutionType === 'REPRINT' ? `
        <p style="color: #6b7280;">Your replacement order will be printed and shipped shortly.</p>
        ` : `
        <p style="color: #6b7280;">Your refund should appear in your account within 5-10 business days.</p>
        `}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${issueUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            View Issue Details
          </a>
        </div>

        <p>Thank you for your patience!</p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Issue Resolved

Hi ${customerName},

Your issue with ${productName} has been resolved.

${resolutionDetails}

View details: ${issueUrl}

Thank you for your patience!

Issue ID: #${issueId.slice(0, 8).toUpperCase()}

---
${APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}

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
  const issueUrl = `${APP_URL}/admin/issues/${issueId}`;

  const reasonLabels: Record<string, string> = {
    DAMAGED_IN_TRANSIT: 'Damaged in Transit',
    QUALITY_ISSUE: 'Quality Issue',
    WRONG_ITEM: 'Wrong Item Sent',
    PRINTING_ERROR: 'Printing Error',
    NEVER_ARRIVED: 'Never Arrived',
    OTHER: 'Other',
  };

  const reasonText = reasonLabels[reason] || reason;

  const subject = `[ACTION REQUIRED] New Issue Report - ${customerName}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">New Issue Alert</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">New Issue Requires Review</h2>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0; color: #6b7280;">Issue ID:</td>
              <td style="padding: 5px 0; font-weight: bold;">#${issueId.slice(0, 8).toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #6b7280;">Customer:</td>
              <td style="padding: 5px 0; font-weight: bold;">${customerName}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #6b7280;">Email:</td>
              <td style="padding: 5px 0;">${customerEmail}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #6b7280;">Order:</td>
              <td style="padding: 5px 0; font-family: monospace;">${orderId.slice(0, 8).toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #6b7280;">Product:</td>
              <td style="padding: 5px 0;">${productName}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #6b7280;">Reason:</td>
              <td style="padding: 5px 0; font-weight: bold; color: #ef4444;">${reasonText}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${issueUrl}" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Review Issue Now
          </a>
        </div>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>${APP_NAME} Admin Alert</p>
      </div>
    </body>
    </html>
  `;

  const text = `
New Issue Alert

Issue ID: #${issueId.slice(0, 8).toUpperCase()}
Customer: ${customerName} (${customerEmail})
Order: ${orderId.slice(0, 8).toUpperCase()}
Product: ${productName}
Reason: ${reasonText}

Review issue: ${issueUrl}

---
${APP_NAME} Admin Alert
  `.trim();

  return sendEmail({ to: adminEmail, subject, html, text });
}
