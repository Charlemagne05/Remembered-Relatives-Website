// Banned words and XSS patterns
const BANNED_WORDS = [
  'offensive1', 'offensive2', 'offensive3', // Add actual banned words as needed
];

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /onerror\s*=/gi,
  /onload\s*=/gi,
  /onclick\s*=/gi,
  /on\w+\s*=/gi, // Catches all on* event handlers
  /<iframe/gi,
  /<embed/gi,
  /<object/gi,
  /eval\s*\(/gi,
  /expression\s*\(/gi,
];

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Validates text content for banned words and XSS patterns
 */
export function validateContent(text: string): ValidationResult {
  // Check for banned words
  const lowerText = text.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lowerText.includes(word.toLowerCase())) {
      return {
        isValid: false,
        message: `Your content contains banned words or inappropriate language. Please revise and try again.`,
      };
    }
  }

  // Check for XSS patterns
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isValid: false,
        message: `Security alert: Your content contains potentially malicious code. Please remove any scripts or HTML tags.`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Sanitizes text by removing dangerous HTML/script tags
 */
export function sanitizeContent(text: string): string {
  let sanitized = text;

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove dangerous attributes
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove iframe, embed, object tags
  sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<embed[^>]*>/gi, '');
  sanitized = sanitized.replace(/<object[^>]*>.*?<\/object>/gi, '');

  return sanitized;
}
