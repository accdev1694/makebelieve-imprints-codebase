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

interface Attachment {
  filename: string;
  content: string; // base64 encoded
  contentType?: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Attachment[];
}

/**
 * Send an email using Resend
 */
export async function sendEmail({ to, subject, html, text, attachments }: SendEmailOptions): Promise<boolean> {
  try {
    const resend = getResendClient();
    console.log('[Email] Sending email to:', to, 'from:', FROM_EMAIL, 'subject:', subject);

    // Build email options
    const emailOptions: {
      from: string;
      to: string;
      subject: string;
      html: string;
      text?: string;
      attachments?: Array<{ filename: string; content: Buffer }>;
    } = {
      from: FROM_EMAIL,
      to,
      subject,
      html,
      text,
    };

    // Add attachments if provided and not empty
    if (attachments && attachments.length > 0) {
      const validAttachments = attachments.filter((att) => att.content && att.content.length > 0);
      if (validAttachments.length > 0) {
        emailOptions.attachments = validAttachments.map((att) => ({
          filename: att.filename,
          content: Buffer.from(att.content, 'base64'),
        }));
        console.log(`[Email] Including ${validAttachments.length} attachment(s)`);
      } else {
        console.log('[Email] No valid attachments to include');
      }
    }

    console.log('[Email] Calling Resend API...');
    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      console.error('[Email] Resend API error:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log('[Email] Email sent successfully, ID:', data?.id);
    return true;
  } catch (error) {
    console.error('[Email] Exception sending email:', error);
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
      <div style="background-color: #6366f1; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>

        <p>Hi ${name},</p>

        <p>We received a request to reset your password for your ${APP_NAME} account. Click the button below to create a new password:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #6366f1;">
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
  const confirmUrl = `${APP_URL}/api/subscribers/confirm?token=${confirmToken}`;

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
      <div style="background-color: #6366f1; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">Confirm Your Subscription</h2>

        <p>Thanks for signing up for our newsletter!</p>

        <p>Please confirm your email address by clicking the button below:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmUrl}" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #6366f1;">
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
      <div style="background-color: #6366f1; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
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
          <a href="${shopUrl}" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #6366f1;">
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
      <div style="background-color: #6366f1; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
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
          <a href="${orderUrl}" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #6366f1;">
            View Replacement Order
          </a>
        </div>

        <p>Thank you for your patience and understanding. We're committed to making things right!</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
          If you have any questions, please reply to this email or contact us at admin@makebelieveimprints.co.uk
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

If you have any questions, please reply to this email or contact us at admin@makebelieveimprints.co.uk

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
      <div style="background-color: #6366f1; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
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
          If you have any questions, please reply to this email or contact us at admin@makebelieveimprints.co.uk
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

If you have any questions, please reply to this email or contact us at admin@makebelieveimprints.co.uk

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
      <div style="background-color: #6366f1; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
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
          <a href="${issueUrl}" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #6366f1;">
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
      <div style="background-color: #f59e0b; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
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
          <a href="${issueUrl}" style="background-color: #f59e0b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #f59e0b;">
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
      <div style="background-color: #10b981; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
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
          <a href="${issueUrl}" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #10b981;">
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
      <div style="background-color: #6366f1; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
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
          <a href="${issueUrl}" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #6366f1;">
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
      <div style="background-color: #6366f1; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
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
          <a href="${issueUrl}" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #6366f1;">
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
      <div style="background-color: #10b981; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
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
          <a href="${issueUrl}" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #10b981;">
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
      <div style="background-color: #ef4444; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
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
          <a href="${issueUrl}" style="background-color: #ef4444; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #ef4444;">
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

// ============================================
// Order Cancellation Email Templates
// ============================================

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
 * Send order cancelled email to customer (when admin cancels)
 */
export async function sendOrderCancelledBySellerEmail(
  email: string,
  customerName: string,
  orderId: string,
  reason: string,
  notes: string | null,
  refundAmount: number | null
): Promise<boolean> {
  const reasonText = CANCELLATION_REASON_LABELS[reason] || reason;
  const formattedRefund = refundAmount
    ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(refundAmount)
    : null;

  const subject = `Your order has been cancelled - ${APP_NAME}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #6366f1; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">Order Cancelled</h2>

        <p>Hi ${customerName},</p>

        <p>We're sorry to inform you that your order has been cancelled.</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Order: <strong>#${orderId.slice(0, 8).toUpperCase()}</strong></p>
          <p style="margin: 10px 0 0; color: #6b7280; font-size: 14px;">Reason: <strong>${reasonText}</strong></p>
          ${notes ? `<p style="margin: 10px 0 0; color: #6b7280; font-size: 14px;">Notes: ${notes}</p>` : ''}
        </div>

        ${formattedRefund ? `
        <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: #065f46; font-size: 14px;">Refund Amount:</p>
          <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold; color: #059669;">${formattedRefund}</p>
          <p style="margin: 10px 0 0; color: #6b7280; font-size: 12px;">Will be credited to your original payment method within 5-10 business days</p>
        </div>
        ` : ''}

        <p>We sincerely apologise for any inconvenience this may have caused. If you have any questions, please don't hesitate to contact us.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_URL}/products" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #6366f1;">
            Continue Shopping
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
          If you have any questions, please contact us at admin@makebelieveimprints.co.uk
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Order Cancelled

Hi ${customerName},

We're sorry to inform you that your order has been cancelled.

Order: #${orderId.slice(0, 8).toUpperCase()}
Reason: ${reasonText}
${notes ? `Notes: ${notes}` : ''}

${formattedRefund ? `Refund Amount: ${formattedRefund}\nWill be credited to your original payment method within 5-10 business days.` : ''}

We sincerely apologise for any inconvenience this may have caused. If you have any questions, please don't hesitate to contact us.

Continue shopping: ${APP_URL}/products

If you have any questions, please contact us at admin@makebelieveimprints.co.uk

---
${APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}

/**
 * Send cancellation request received email to customer
 */
export async function sendCancellationRequestReceivedEmail(
  email: string,
  customerName: string,
  orderId: string,
  reason: string
): Promise<boolean> {
  const orderUrl = `${APP_URL}/orders/${orderId}`;
  const reasonText = CANCELLATION_REASON_LABELS[reason] || reason;

  const subject = `Cancellation request received - ${APP_NAME}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #6366f1; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">Cancellation Request Received</h2>

        <p>Hi ${customerName},</p>

        <p>We've received your request to cancel your order.</p>

        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">Order: <strong>#${orderId.slice(0, 8).toUpperCase()}</strong></p>
          <p style="margin: 10px 0 0; color: #92400e; font-size: 14px;">Reason: <strong>${reasonText}</strong></p>
          <p style="margin: 10px 0 0; color: #92400e; font-size: 14px;">Status: <strong>Pending Review</strong></p>
        </div>

        <p><strong>What happens next?</strong></p>
        <ul style="color: #6b7280;">
          <li>Our team will review your request within 24 hours</li>
          <li>If your order hasn't started production, we'll approve the cancellation</li>
          <li>If production has begun, we may not be able to cancel</li>
          <li>You'll receive an email with our decision</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${orderUrl}" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #6366f1;">
            View Order Status
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
Cancellation Request Received

Hi ${customerName},

We've received your request to cancel your order.

Order: #${orderId.slice(0, 8).toUpperCase()}
Reason: ${reasonText}
Status: Pending Review

What happens next?
- Our team will review your request within 24 hours
- If your order hasn't started production, we'll approve the cancellation
- If production has begun, we may not be able to cancel
- You'll receive an email with our decision

View order status: ${orderUrl}

---
${APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}

/**
 * Send cancellation request approved email to customer
 */
export async function sendCancellationRequestApprovedEmail(
  email: string,
  customerName: string,
  orderId: string,
  refundAmount: number | null,
  reviewNotes: string | null
): Promise<boolean> {
  const formattedRefund = refundAmount
    ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(refundAmount)
    : null;

  const subject = `Cancellation approved - Order #${orderId.slice(0, 8).toUpperCase()}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #10b981; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">Cancellation Approved</h2>

        <p>Hi ${customerName},</p>

        <p>Your cancellation request for order #${orderId.slice(0, 8).toUpperCase()} has been approved.</p>

        ${formattedRefund ? `
        <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: #065f46; font-size: 14px;">Refund Amount:</p>
          <p style="margin: 5px 0 0; font-size: 28px; font-weight: bold; color: #059669;">${formattedRefund}</p>
          <p style="margin: 10px 0 0; color: #6b7280; font-size: 12px;">Will be credited within 5-10 business days</p>
        </div>
        ` : ''}

        ${reviewNotes ? `
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>Note from our team:</strong> ${reviewNotes}</p>
        </div>
        ` : ''}

        <p>We're sorry to see this order go. We hope to serve you again in the future!</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_URL}/products" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #10b981;">
            Continue Shopping
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
Cancellation Approved

Hi ${customerName},

Your cancellation request for order #${orderId.slice(0, 8).toUpperCase()} has been approved.

${formattedRefund ? `Refund Amount: ${formattedRefund}\nWill be credited within 5-10 business days.` : ''}

${reviewNotes ? `Note from our team: ${reviewNotes}` : ''}

We're sorry to see this order go. We hope to serve you again in the future!

Continue shopping: ${APP_URL}/products

---
${APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}

/**
 * Send cancellation request rejected email to customer
 */
export async function sendCancellationRequestRejectedEmail(
  email: string,
  customerName: string,
  orderId: string,
  reviewNotes: string | null
): Promise<boolean> {
  const orderUrl = `${APP_URL}/orders/${orderId}`;

  const subject = `Cancellation request update - Order #${orderId.slice(0, 8).toUpperCase()}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #6366f1; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">Cancellation Request Update</h2>

        <p>Hi ${customerName},</p>

        <p>We've reviewed your cancellation request for order #${orderId.slice(0, 8).toUpperCase()}, and unfortunately we're unable to cancel this order at this time.</p>

        <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: bold;">Reason:</p>
          <p style="margin: 10px 0 0; color: #991b1b;">${reviewNotes || 'Your order has already entered production and cannot be cancelled.'}</p>
        </div>

        <p>Your order will continue to be processed and shipped as normal. Once you receive your order, if there are any issues with it, you can submit a return or exchange request.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${orderUrl}" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #6366f1;">
            View Order Status
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
          If you have any questions, please contact us at admin@makebelieveimprints.co.uk
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Cancellation Request Update

Hi ${customerName},

We've reviewed your cancellation request for order #${orderId.slice(0, 8).toUpperCase()}, and unfortunately we're unable to cancel this order at this time.

Reason: ${reviewNotes || 'Your order has already entered production and cannot be cancelled.'}

Your order will continue to be processed and shipped as normal. Once you receive your order, if there are any issues with it, you can submit a return or exchange request.

View order status: ${orderUrl}

If you have any questions, please contact us at admin@makebelieveimprints.co.uk

---
${APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}

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
  const issueUrl = `${APP_URL}/account/issues/${issueId}`;

  // Map final status to user-friendly text
  const statusLabels: Record<string, string> = {
    COMPLETED: 'resolved',
    REJECTED: 'reviewed and closed',
    CLOSED: 'closed',
  };
  const statusText = statusLabels[finalStatus] || 'concluded';

  const subject = `Your issue has been ${statusText} - ${APP_NAME}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #6366f1; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">Issue Concluded</h2>

        <p>Hi ${customerName},</p>

        <p>Your issue regarding <strong>${productName}</strong> has been ${statusText} and is now concluded.</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Issue ID: <strong>#${issueId.slice(0, 8).toUpperCase()}</strong></p>
          <p style="margin: 10px 0 0; color: #6b7280; font-size: 14px;">Product: <strong>${productName}</strong></p>
          <p style="margin: 10px 0 0; color: #6b7280; font-size: 14px;">Status: <strong>Concluded</strong></p>
        </div>

        ${concludedReason ? `
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>Note from our team:</strong></p>
          <p style="margin: 10px 0 0; color: #4b5563;">${concludedReason}</p>
        </div>
        ` : ''}

        <p style="color: #6b7280;">This issue is now closed and no further action is required. You can still view the full conversation history for your records.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${issueUrl}" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #6366f1;">
            View Issue Details
          </a>
        </div>

        <p>Thank you for your patience throughout this process.</p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
          If you have any questions, please contact us at admin@makebelieveimprints.co.uk
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Issue Concluded

Hi ${customerName},

Your issue regarding ${productName} has been ${statusText} and is now concluded.

Issue ID: #${issueId.slice(0, 8).toUpperCase()}
Product: ${productName}
Status: Concluded

${concludedReason ? `Note from our team: ${concludedReason}` : ''}

This issue is now closed and no further action is required. You can still view the full conversation history for your records.

View issue details: ${issueUrl}

Thank you for your patience throughout this process.

If you have any questions, please contact us at admin@makebelieveimprints.co.uk

---
${APP_NAME}
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}

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
  const orderUrl = `${APP_URL}/admin/orders/${orderId}`;
  const reasonText = CANCELLATION_REASON_LABELS[reason] || reason;
  const formattedTotal = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(orderTotal);

  const subject = `[ACTION REQUIRED] Cancellation Request - Order #${orderId.slice(0, 8).toUpperCase()}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f59e0b; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Cancellation Request</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">Customer Wants to Cancel</h2>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0; color: #6b7280;">Order:</td>
              <td style="padding: 5px 0; font-weight: bold;">#${orderId.slice(0, 8).toUpperCase()}</td>
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
              <td style="padding: 5px 0; color: #6b7280;">Order Total:</td>
              <td style="padding: 5px 0; font-weight: bold; color: #059669;">${formattedTotal}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #6b7280;">Reason:</td>
              <td style="padding: 5px 0; font-weight: bold; color: #f59e0b;">${reasonText}</td>
            </tr>
          </table>
        </div>

        ${notes ? `
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Customer's notes:</strong></p>
          <p style="margin: 10px 0 0; color: #92400e;">${notes}</p>
        </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${orderUrl}" style="background-color: #f59e0b; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #f59e0b;">
            Review & Respond
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
Cancellation Request

Order: #${orderId.slice(0, 8).toUpperCase()}
Customer: ${customerName} (${customerEmail})
Order Total: ${formattedTotal}
Reason: ${reasonText}
${notes ? `Customer's notes: ${notes}` : ''}

Review and respond: ${orderUrl}

---
${APP_NAME} Admin Alert
  `.trim();

  return sendEmail({ to: adminEmail, subject, html, text });
}

/**
 * Send invoice email with PDF attachment
 */
export async function sendInvoiceEmail(
  email: string,
  customerName: string,
  invoiceNumber: string,
  orderReference: string,
  totalAmount: number,
  pdfBase64: string
): Promise<boolean> {
  const formattedTotal = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(totalAmount);

  const orderUrl = `${APP_URL}/orders`;

  const subject = `Your Invoice ${invoiceNumber} from ${APP_NAME}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #6366f1; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">Thank You for Your Order!</h2>

        <p>Hi ${customerName},</p>

        <p>Thank you for your order with ${APP_NAME}! Your payment has been successfully processed.</p>

        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p style="margin: 0 0 10px; font-weight: bold; color: #166534;">Payment Confirmed</p>
          <p style="margin: 0; color: #166534;">Your invoice is attached to this email.</p>
        </div>

        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Invoice Number:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Order Reference:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">#${orderReference}</td>
            </tr>
            <tr style="border-top: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; color: #1f2937; font-weight: bold;">Total Paid:</td>
              <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px; color: #6366f1;">${formattedTotal}</td>
            </tr>
          </table>
        </div>

        <p>We'll start processing your order right away. You'll receive another email once your order has been dispatched.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${orderUrl}" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #6366f1;">
            View Your Orders
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
          If you have any questions about your order, please reply to this email or contact us at hello@makebelieveimprints.co.uk
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
        <p>Custom Print Services | United Kingdom</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Thank You for Your Order!

Hi ${customerName},

Thank you for your order with ${APP_NAME}! Your payment has been successfully processed.

Invoice Number: ${invoiceNumber}
Order Reference: #${orderReference}
Total Paid: ${formattedTotal}

Your invoice is attached to this email as a PDF.

We'll start processing your order right away. You'll receive another email once your order has been dispatched.

View your orders: ${orderUrl}

If you have any questions, please reply to this email or contact us at hello@makebelieveimprints.co.uk

---
${APP_NAME}
Custom Print Services | United Kingdom
  `.trim();

  return sendEmail({
    to: email,
    subject,
    html,
    text,
    attachments: [
      {
        filename: `Invoice-${invoiceNumber}.pdf`,
        content: pdfBase64,
        contentType: 'application/pdf',
      },
    ],
  });
}

// ============================================
// Cart/Wishlist Recovery Email Templates
// ============================================

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
  const actionUrl = isCart ? `${APP_URL}/cart` : `${APP_URL}/account/wishlist`;
  const itemLabel = isCart ? 'cart' : 'wishlist';

  const subject = isCart
    ? `Your cart is waiting! Here's ${discountPercent}% off`
    : `Items you love are still waiting! Get ${discountPercent}% off`;

  // Build product list HTML (max 5 items)
  const productListHtml = items.slice(0, 5).map((item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 80px; vertical-align: top;">
              <img src="${item.productImage}" alt="${item.productName}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px;">
            </td>
            <td style="vertical-align: top; padding-left: 12px;">
              <p style="margin: 0; font-weight: 500; color: #1f2937;">${item.productName}</p>
              <p style="margin: 5px 0 0; color: #6366f1; font-weight: bold;">£${item.price.toFixed(2)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  const moreItemsText = items.length > 5 ? `<p style="color: #6b7280; font-size: 14px; text-align: center;">+ ${items.length - 5} more item${items.length - 5 > 1 ? 's' : ''}</p>` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #6366f1; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0;">
          ${isCart ? 'You left something behind!' : 'Still thinking about these?'}
        </h2>

        <p>Hi ${firstName},</p>

        <p>
          ${isCart
            ? 'We noticed you have items waiting in your cart. Don\'t let them slip away!'
            : 'Those items in your wishlist are calling your name. Now\'s the perfect time to treat yourself!'}
        </p>

        <!-- Product List -->
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f9fafb; border-radius: 8px;">
          ${productListHtml}
        </table>
        ${moreItemsText}

        <!-- Promo Code Box -->
        <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
          <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Exclusive Discount Code</p>
          <p style="margin: 10px 0; font-size: 32px; font-weight: bold; color: white; letter-spacing: 3px;">${promoCode}</p>
          <p style="margin: 0; color: white; font-size: 20px; font-weight: bold;">${discountPercent}% OFF</p>
          <p style="margin: 10px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">
            ⏰ Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${actionUrl}" style="background-color: #6366f1; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #6366f1; font-size: 16px;">
            ${isCart ? 'Complete Your Order' : 'Shop Your Wishlist'}
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; text-align: center;">
          Enter code <strong>${promoCode}</strong> at checkout to save ${discountPercent}%
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0; text-align: center;">
          You're receiving this because you have items in your ${itemLabel}.
          <br>
          <a href="${APP_URL}/account/preferences" style="color: #9ca3af;">Manage email preferences</a>
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const productListText = items.slice(0, 5).map((item) =>
    `• ${item.productName} - £${item.price.toFixed(2)}`
  ).join('\n');

  const text = `
${isCart ? 'You left something behind!' : 'Still thinking about these?'}

Hi ${firstName},

${isCart
  ? 'We noticed you have items waiting in your cart. Don\'t let them slip away!'
  : 'Those items in your wishlist are calling your name. Now\'s the perfect time to treat yourself!'}

Your items:
${productListText}
${items.length > 5 ? `+ ${items.length - 5} more items` : ''}

---

🎉 EXCLUSIVE DISCOUNT CODE: ${promoCode}
💰 ${discountPercent}% OFF your order
⏰ Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}

---

${isCart ? 'Complete your order' : 'Shop your wishlist'}: ${actionUrl}

Enter code ${promoCode} at checkout to save ${discountPercent}%!

---
${APP_NAME}
  `.trim();

  return sendEmail({ to, subject, html, text });
}

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
  const reviewUrl = `${APP_URL}/orders/${orderId}?review=true`;
  const pointsReward = 50;

  const subject = `How was your order? Leave a review & earn ${pointsReward} points!`;

  // Build product list HTML
  const productListHtml = orderItems.slice(0, 3).map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
        ${item.name} ${item.quantity > 1 ? `(x${item.quantity})` : ''}
      </td>
    </tr>
  `).join('');

  const moreItemsText = orderItems.length > 3
    ? `<p style="color: #6b7280; font-size: 14px;">+ ${orderItems.length - 3} more item${orderItems.length - 3 > 1 ? 's' : ''}</p>`
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f3f4f6;">
      <div style="background-color: #6366f1; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${APP_NAME}</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #1f2937; margin-top: 0; text-align: center;">
          Your order has arrived!
        </h2>

        <p>Hi ${firstName},</p>

        <p>We hope you're loving your order! We'd really appreciate it if you could take a moment to share your experience.</p>

        <!-- Order Summary -->
        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px; font-weight: bold; color: #374151;">Your order included:</p>
          <table style="width: 100%; border-collapse: collapse;">
            ${productListHtml}
          </table>
          ${moreItemsText}
        </div>

        <!-- Points Reward Box -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center;">
          <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Earn Loyalty Points</p>
          <p style="margin: 10px 0; font-size: 48px; font-weight: bold; color: white;">+${pointsReward}</p>
          <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 16px;">points when you leave a review</p>
          <p style="margin: 10px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">
            100 points = £1 off your next order
          </p>
        </div>

        <!-- Star Rating Preview -->
        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #6b7280; margin-bottom: 15px;">How would you rate your experience?</p>
          <div style="font-size: 36px; letter-spacing: 8px;">
            ⭐ ⭐ ⭐ ⭐ ⭐
          </div>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${reviewUrl}" style="background-color: #6366f1; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; border: 2px solid #6366f1; font-size: 16px;">
            Leave a Review & Earn ${pointsReward} Points
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; text-align: center;">
          It only takes a minute and helps other customers!
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0; text-align: center;">
          Thank you for shopping with ${APP_NAME}!
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

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

🎉 EARN ${pointsReward} LOYALTY POINTS
Leave a review and get ${pointsReward} points!
100 points = £1 off your next order

---

Leave your review here: ${reviewUrl}

It only takes a minute and helps other customers!

---
Thank you for shopping with ${APP_NAME}!
  `.trim();

  return sendEmail({ to: email, subject, html, text });
}
