import { REDACTED_KEYWORD } from '@extension/shared';

const REDACT_HEADER_KEYS = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
const REDACT_BODY_KEYS = ['password', 'pass', 'token', 'secret', 'authorization', 'auth'];

const redactHeaderValue = (key: string, value: string): string =>
  REDACT_HEADER_KEYS.includes(key.toLowerCase()) ? REDACTED_KEYWORD : value;

const redactObject = (obj: unknown): unknown => {
  if (Array.isArray(obj)) return obj.map(redactObject);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k,
        REDACT_BODY_KEYS.some(x => k.toLowerCase().includes(x)) ? REDACTED_KEYWORD : redactObject(v),
      ]),
    );
  }
  return obj;
};

/**
 * Attempts to parse a string as JSON and redact sensitive keys.
 * Returns the original value if parsing fails or input is not a string.
 */
const redactSensitiveBodyKeys = (body: unknown): unknown => {
  if (typeof body !== 'string') return body;

  const trimmed = body.trim();
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return body;

  try {
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(redactObject(parsed));
  } catch {
    return body;
  }
};

export { REDACT_BODY_KEYS, REDACT_HEADER_KEYS, redactHeaderValue, redactSensitiveBodyKeys };
