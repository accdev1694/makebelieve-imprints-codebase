/**
 * Email Module - Re-exports all email functionality
 *
 * This maintains backward compatibility with the original email.ts
 * while providing a modular template structure.
 */

// Core send function
export { sendEmail, type SendEmailOptions, type Attachment } from './send';

// Configuration
export { EMAIL_CONFIG, COLORS, STYLES, formatCurrency, formatOrderId, truncateText, getCurrentYear } from './config';

// Partials (for creating new templates)
export * from './partials';

// Auth templates
export { sendPasswordResetEmail, sendSubscriptionConfirmEmail, sendWelcomeEmail } from './templates/auth';

// Resolution templates
export { sendRefundConfirmationEmail, sendReprintConfirmationEmail } from './templates/resolutions';

// Issue templates
export {
  sendIssueReceivedEmail,
  sendIssueInfoRequestedEmail,
  sendIssueApprovedEmail,
  sendIssueRejectedEmail,
  sendIssueMessageEmail,
  sendIssueResolvedEmail,
  sendIssueConcludedEmail,
} from './templates/issues';

// Admin alert templates
export {
  sendAdminNewIssueAlert,
  sendAdminCancellationRequestAlert,
} from './templates/admin-alerts';

// Order templates
export {
  sendOrderCancelledBySellerEmail,
  sendCancellationRequestReceivedEmail,
  sendCancellationRequestApprovedEmail,
  sendCancellationRequestRejectedEmail,
  sendInvoiceEmail,
} from './templates/orders';

// Marketing templates
export { sendRecoveryEmail, sendReviewRequestEmail } from './templates/marketing';
