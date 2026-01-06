/**
 * Email Module - Re-exports all email functionality
 *
 * This maintains backward compatibility with the original email.ts
 * while allowing gradual migration to the new template structure.
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
export { sendRefundConfirmationEmail } from './templates/resolutions';

// Issue templates
export { sendIssueReceivedEmail } from './templates/issues';

// NOTE: Remaining templates are still in the original email.ts file
// They will be migrated incrementally and re-exported here
