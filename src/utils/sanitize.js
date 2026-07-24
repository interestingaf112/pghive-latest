/* eslint-disable no-control-regex */
/**
 * Input validation and sanitization utilities for PGhive.
 * Used by AdminDashboard form and firebase.js before writing to any store.
 */

/**
 * Escape standard SQL characters to block SQL injection attacks.
 * @param {string} val - Input to escape
 * @returns {string} Escaped string
 */
export function escapeSql(val) {
  if (val === undefined || val === null) {
    return '';
  }
  const str = typeof val === 'string' ? val : String(val);
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/"/g, '\\"')
    .replace(/\x00/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
}

/**
 * Escape NoSQL (MongoDB/Firestore) operators and period nested key delimiters.
 * @param {string} val - Input to escape
 * @returns {string} Escaped string
 */
export function escapeNoSql(val) {
  if (val === undefined || val === null) {
    return '';
  }
  const str = typeof val === 'string' ? val : String(val);
  // Remove leading '$' which initiates operators, and replace '.' to prevent nested field path hijacking
  return str.replace(/^\$/, '').replace(/\./g, '_');
}

/**
 * Strip HTML tags, trim whitespace, enforce max length, and block SQL/XSS patterns.
 * @param {string} input - Raw user input
 * @param {number} maxLength - Maximum allowed characters (default 500)
 * @returns {string} Sanitized string
 */
export function sanitizeText(input, maxLength = 500) {
  if (typeof input !== 'string') {
    throw new Error('Input must be a valid string.');
  }
  
  if (input.length > maxLength) {
    throw new Error(`Input exceeds maximum allowed length of ${maxLength} characters.`);
  }

  // Reject if it contains HTML or script tag patterns to prevent XSS
  if (/<[^>]*>/g.test(input)) {
    throw new Error('HTML/script tags are not allowed in inputs.');
  }

  const collapsed = input.replace(/\s+/g, ' ').trim();
  
  if (collapsed.length === 0 && input.length > 0) {
    throw new Error('Input cannot be empty or contain only whitespace.');
  }

  // Block common SQL injection comments and keywords to protect backend queries
  const lowerInput = collapsed.toLowerCase();
  if (
    lowerInput.includes('union select') ||
    lowerInput.includes('--') ||
    lowerInput.includes('/*') ||
    lowerInput.includes('*/') ||
    lowerInput.includes('; drop table') ||
    lowerInput.includes('; delete from')
  ) {
    throw new Error('Dangerous input sequence detected (SQL/script injection block).');
  }

  return collapsed;
}

/**
 * Validate and clean an Indian phone number.
 * Accepts formats: +91XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX
 * @param {string} phone - Raw phone input
 * @returns {{ valid: boolean, cleaned: string, error: string }}
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, cleaned: '', error: 'Phone number is required.' };
  }

  // Reject oversized input
  if (phone.length > 25) {
    return { valid: false, cleaned: '', error: 'Phone number exceeds maximum length.' };
  }
  
  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^0-9+]/g, '');
  
  // Extract just digits
  const digits = cleaned.replace(/\D/g, '');
  
  // Must have 10 digits (Indian mobile) or 12 digits (with 91 prefix)
  if (digits.length === 10) {
    return { valid: true, cleaned: `+91 ${digits.substring(0, 5)} ${digits.substring(5)}`, error: '' };
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.substring(2);
    return { valid: true, cleaned: `+91 ${local.substring(0, 5)} ${local.substring(5)}`, error: '' };
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    const local = digits.substring(1);
    return { valid: true, cleaned: `+91 ${local.substring(0, 5)} ${local.substring(5)}`, error: '' };
  }
  
  return { valid: false, cleaned: '', error: 'Enter a valid 10-digit Indian mobile number.' };
}

/**
 * Validate email format.
 * @param {string} email - Raw email input
 * @returns {{ valid: boolean, error: string }}
 */
export function validateEmail(email) {
  if (email === undefined || email === null) {
    return { valid: true, error: '' };
  }
  
  if (typeof email !== 'string') {
    return { valid: false, error: 'Email must be a valid string.' };
  }
  
  const trimmed = email.trim();
  if (trimmed.length === 0) {
    return { valid: true, error: '' }; // Email is optional
  }
  
  if (trimmed.length > 254) {
    return { valid: false, error: 'Email address is too long.' };
  }
  
  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Enter a valid email address.' };
  }
  
  return { valid: true, error: '' };
}

/**
 * Validate price as a positive integer within reasonable bounds.
 * @param {string|number} price - Raw price input
 * @returns {{ valid: boolean, value: number, error: string }}
 */
export function validatePrice(price) {
  // Reject oversized raw inputs
  if (String(price).length > 10) {
    return { valid: false, value: 0, error: 'Price input is too long.' };
  }

  const num = Number(price);
  
  if (isNaN(num) || !isFinite(num)) {
    return { valid: false, value: 0, error: 'Enter a valid number.' };
  }
  
  if (num <= 0) {
    return { valid: false, value: 0, error: 'Price must be greater than zero.' };
  }
  
  if (num > 500000) {
    return { valid: false, value: 0, error: 'Price cannot exceed ₹5,00,000.' };
  }
  
  if (!Number.isInteger(num)) {
    return { valid: true, value: Math.round(num), error: '' };
  }
  
  return { valid: true, value: num, error: '' };
}

/**
 * Validate file for upload.
 * @param {File} file - File object to validate
 * @param {number} maxSizeMB - Maximum file size in MB (default 5)
 * @returns {{ valid: boolean, error: string, sanitizedName: string }}
 */
export function validateFile(file, maxSizeMB = 5) {
  if (!file) {
    return { valid: false, error: 'No file provided.', sanitizedName: '' };
  }
  
  if (typeof file.name !== 'string' || file.name.length > 255) {
    return { valid: false, error: 'Invalid file name length.', sanitizedName: '' };
  }

  if (!file.type.startsWith('image/')) {
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
    return { valid: false, error: `"${cleanName}" is not a valid image file.`, sanitizedName: '' };
  }
  
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 50);
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `"${cleanName}" is ${sizeMB}MB — max ${maxSizeMB}MB allowed.`, sanitizedName: '' };
  }
  
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  return { valid: true, error: '', sanitizedName };
}

