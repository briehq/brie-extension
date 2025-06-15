/**
 * Sensitive value patterns with optional capture group to replace only part.
 * If `groupIndex` is set, only that part of the match will be replaced.
 */
export const sensitivePatterns: {
  pattern: RegExp;
  groupIndex?: number;
}[] = [
  // 1. Key-value: password, token, secret, etc. — structured
  {
    pattern: /["']?(password|token|api[_-]?key|access[_-]?token|secret)["']?\s*[:=]\s*["']([^"'`]+)["']/gi,
    groupIndex: 2,
  },

  // 2. Bearer JWT token — full string in one line
  {
    pattern: /Bearer\s+(eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)/gi,
    groupIndex: 1,
  },

  // 3. Authorization header — captures just the token
  {
    pattern: /(?:Authorization["'\s:]*|Bearer\s+)(eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)/gi,
    groupIndex: 1,
  },

  // 4. Raw JWT (no prefix)
  {
    pattern: /(eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)/g,
  },

  // 5. API keys or secrets — loose match
  {
    pattern: /(?:api[_-]?key|access[_-]?token|client[_-]?secret)["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-.]{16,64})["']?/gi,
    groupIndex: 1,
  },

  // 6. Client ID or secret — explicit
  {
    pattern: /(?:client[_-]?(id|secret))["']?\s*[:=]\s*["']?([A-Za-z0-9_-]{16,})["']?/gi,
    groupIndex: 2,
  },

  // 7. Email addresses
  {
    pattern: /([a-zA-Z0-9._%+-]+(?:%40|@)[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/gi,
  },

  // 8. US Social Security Numbers
  {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
  },

  // 9. Credit card numbers — Visa, MC, Amex
  {
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
  },

  // 10. CVV, CVC, CID — 3 or 4 digits
  {
    pattern: /\b(?:cvv|cvc|cid)["']?\s*[:=]\s*["']?(\d{3,4})["']?/gi,
    groupIndex: 1,
  },

  // 11. Routing / Bank account numbers
  {
    pattern: /\b(?:routing|account)[-_ ]?number["']?\s*[:=]\s*["']?(\d{6,20})["']?/gi,
    groupIndex: 1,
  },

  // 12. Expiration dates — MM/YY or MM/YYYY
  {
    pattern: /\b(0[1-9]|1[0-2])\/(\d{2}|\d{4})\b/g,
  },

  // 13. Phone numbers — US-style, liberal
  {
    pattern: /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?)[-.\s]?\d{3}[-.\s]?\d{4}/g,
  },

  // 14. IPv4 addresses
  {
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  },

  // 15. IPv6 addresses
  {
    pattern: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
  },

  // 16. AI API Keys (OpenAI, Anthropic, HuggingFace, etc.)
  {
    pattern: /(sk-[a-zA-Z0-9]{32,})/g, // OpenAI
  },
  {
    pattern: /(cla-[a-zA-Z0-9]{32,})/g, // Anthropic
  },
  {
    pattern: /(hf_[a-zA-Z0-9]{32,})/g, // HuggingFace
  },
];
