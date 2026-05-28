// Banned words and XSS patterns — vérification côté client (le backend vérifie aussi en DB)
const BANNED_WORDS = [
  // Insultes françaises
  'connard','connasse','salope','pute','putain','enculé','enculer',
  'fils de pute','nique','niquer','baise','baiser','bite','couille',
  'chier','foutre','fdp','tg','ta gueule','gueule','con','conne',
  'abruti','crétin','débile','taré','tarée','mongol',
  'raciste','nazi','pédé','pd','tapette','gouine',
  // Insultes anglaises
  'fuck','fucking','fucker','shit','asshole','bitch','bastard','dick','cunt',
  'pussy','cock','whore','slut','nigger','nigga','faggot','retard',
  'kill yourself','kys',
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
