export const highRiskValuePatterns: { pattern: RegExp; groupIndex?: number }[] = [
  // Bearer JWT
  {
    pattern: /(?:Authorization["'\s:]*Bearer\s+|Bearer\s+)(eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)/gi,
    groupIndex: 1,
  },
  // Raw JWT
  { pattern: /\b(eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)\b/g, groupIndex: 1 },
  // OpenAI / Anthropic / HF keys
  { pattern: /\b(sk-[a-zA-Z0-9]{32,})\b/g, groupIndex: 1 },
  { pattern: /\b(cla-[a-zA-Z0-9]{32,})\b/g, groupIndex: 1 },
  { pattern: /\b(hf_[a-zA-Z0-9]{32,})\b/g, groupIndex: 1 },
];

export const keyedSecretPatterns: { pattern: RegExp; groupIndex?: number }[] = [
  // password/token/api_key/etc. in key:value text
  {
    pattern: /["']?(password|token|api[_-]?key|access[_-]?token|secret)["']?\s*[:=]\s*["']([^"'`]+)["']/gi,
    groupIndex: 2,
  },
  // client id/secret explicit fields
  { pattern: /(?:client[_-]?(id|secret))["']?\s*[:=]\s*["']?([A-Za-z0-9_-]{16,})["']?/gi, groupIndex: 2 },
  // loose API tokens in key:value
  {
    pattern: /(?:api[_-]?key|access[_-]?token|client[_-]?secret)["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-.]{16,64})["']?/gi,
    groupIndex: 1,
  },
];

export const optionalPiiPatterns: { pattern: RegExp; groupIndex?: number }[] = [
  // EMAIL — disable to respect "Username/email should not be edited"
  // { pattern: /([a-zA-Z0-9._%+-]+(?:%40|@)[a-zA-Z0-9-]+\.[a-zA-Z]{2,})/gi, groupIndex: 1 },
  // PHONE / IP — disable or gate by key context if you must redact
  // { pattern: /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?)[-.\s]?\d{3}[-.\s]?\d{4}/g },
  // { pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
  // { pattern: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g },
  // Expiration date MM/YY or MM/YYYY — typically not a secret; disable
  // { pattern: /\b(0[1-9]|1[0-2])\/(\d{2}|\d{4})\b/g },
];
