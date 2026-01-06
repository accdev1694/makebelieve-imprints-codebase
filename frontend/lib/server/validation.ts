import { PAGINATION, PASSWORD } from '@/lib/config/constants';

/**
 * Shared validation utilities for auth endpoints
 */

// Email validation regex (RFC 5322 simplified)
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Password complexity requirements
export const PASSWORD_REQUIREMENTS = {
  minLength: PASSWORD.MIN_LENGTH,
  requireUppercase: /[A-Z]/,
  requireLowercase: /[a-z]/,
  requireNumber: /[0-9]/,
  requireSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
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
  // eslint-disable-next-line no-control-regex
  const controlCharsRegex = /[\x00-\x1F\x7F]/g;
  return name
    .trim()
    .replace(controlCharsRegex, '') // Remove control characters
    .replace(/[<>]/g, '') // Remove potential HTML injection chars
    .substring(0, PASSWORD.MAX_NAME_LENGTH); // Limit to 100 characters
}

// ============================================
// Extended Validators
// ============================================

// UUID validation regex (v1-5)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates UUID format
 */
export function validateUUID(id: string): ValidationResult {
  if (!id || !UUID_REGEX.test(id)) {
    return { valid: false, errors: ['Invalid ID format'] };
  }
  return { valid: true, errors: [] };
}

/**
 * Validates and normalizes pagination parameters
 * Returns safe defaults if invalid
 */
export function validatePagination(
  page: unknown,
  limit: unknown,
  maxLimit: number = PAGINATION.MAX_LIMIT
): { page: number; limit: number } {
  const parsedPage = parseInt(String(page || '1'), 10);
  const parsedLimit = parseInt(String(limit || String(PAGINATION.DEFAULT_LIMIT)), 10);

  return {
    page: Math.max(1, isNaN(parsedPage) ? 1 : parsedPage),
    limit: Math.min(maxLimit, Math.max(1, isNaN(parsedLimit) ? PAGINATION.DEFAULT_LIMIT : parsedLimit)),
  };
}

/**
 * Validates a numeric amount (non-negative)
 * Returns the parsed value on success
 */
export function validateAmount(
  amount: unknown,
  fieldName: string = 'Amount'
): { valid: boolean; value?: number; errors: string[] } {
  const num = Number(amount);
  if (isNaN(num) || num < 0) {
    return { valid: false, errors: [`${fieldName} must be a valid non-negative number`] };
  }
  return { valid: true, value: num, errors: [] };
}

/**
 * Validates a positive integer
 */
export function validatePositiveInt(value: unknown, fieldName: string = 'Value'): ValidationResult {
  const num = Number(value);
  if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
    return { valid: false, errors: [`${fieldName} must be a positive integer`] };
  }
  return { valid: true, errors: [] };
}

/**
 * Creates a string length validator
 */
export function createStringValidator(
  fieldName: string,
  minLength: number,
  maxLength: number
): (value: string) => ValidationResult {
  return (value: string): ValidationResult => {
    const errors: string[] = [];
    if (!value || typeof value !== 'string') {
      errors.push(`${fieldName} is required`);
      return { valid: false, errors };
    }
    if (value.length < minLength) {
      errors.push(`${fieldName} must be at least ${minLength} characters`);
    }
    if (value.length > maxLength) {
      errors.push(`${fieldName} must be at most ${maxLength} characters`);
    }
    return { valid: errors.length === 0, errors };
  };
}

/**
 * Creates an enum validator
 * Returns the validated value on success for type safety
 */
export function createEnumValidator<T extends string>(
  fieldName: string,
  validValues: readonly T[]
): (value: unknown) => { valid: boolean; value?: T; errors: string[] } {
  return (value: unknown): { valid: boolean; value?: T; errors: string[] } => {
    if (typeof value !== 'string' || !validValues.includes(value as T)) {
      return {
        valid: false,
        errors: [`Invalid ${fieldName}. Must be one of: ${validValues.join(', ')}`],
      };
    }
    return { valid: true, value: value as T, errors: [] };
  };
}

/**
 * Validates that required fields are present and non-empty
 * Returns list of missing fields for detailed error handling
 */
export function validateRequired(
  fields: Record<string, unknown>,
  requiredKeys?: string[]
): { valid: boolean; missing?: string[]; errors: string[] } {
  const keysToCheck = requiredKeys || Object.keys(fields);
  const missing: string[] = [];

  for (const key of keysToCheck) {
    const value = fields[key];
    if (value === undefined || value === null || value === '') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    return {
      valid: false,
      missing,
      errors: [`Missing required fields: ${missing.join(', ')}`],
    };
  }
  return { valid: true, errors: [] };
}

/**
 * Combines multiple validation results into one
 */
export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap((r) => r.errors);
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
  };
}
