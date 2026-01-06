import { Resend } from 'resend';
import { EMAIL_CONFIG } from './config';

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

export interface Attachment {
  filename: string;
  content: string; // base64 encoded
  contentType?: string;
}

export interface SendEmailOptions {
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
    console.log('[Email] Sending email to:', to, 'from:', EMAIL_CONFIG.FROM_EMAIL, 'subject:', subject);

    // Build email options
    const emailOptions: {
      from: string;
      to: string;
      subject: string;
      html: string;
      text?: string;
      attachments?: Array<{ filename: string; content: Buffer }>;
    } = {
      from: EMAIL_CONFIG.FROM_EMAIL,
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
