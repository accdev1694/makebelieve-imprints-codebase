/**
 * Shared validation utilities for auth endpoints
 */

// Email validation regex (RFC 5322 simplified)
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Password complexity requirements
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: /[A-Z]/,
  requireLowercase: /[a-z]/,
  requireNumber: /[0-9]/,
  requireSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates password against complexity requirements
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
  }
  if (!PASSWORD_REQUIREMENTS.requireUppercase.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!PASSWORD_REQUIREMENTS.requireLowercase.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!PASSWORD_REQUIREMENTS.requireNumber.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!PASSWORD_REQUIREMENTS.requireSpecial.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates email format
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, errors: ['Please enter a valid email address'] };
  }
  return { valid: true, errors: [] };
}

/**
 * Sanitizes user name input
 */
export function sanitizeName(name: string): string {
  return name
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[<>]/g, '') // Remove potential HTML injection chars
    .substring(0, 100); // Limit to 100 characters
}
