/* eslint-disable @typescript-eslint/no-explicit-any */
import { isNonProduction } from './is-non-production.util.js';
import { REDACTED_KEYWORD } from '../constants/redacted-keyword.constants.js';
import { EXEMPT_KEYS, keyMatches, NON_SENSITIVE_KEYS, STRONG_KEYS } from '../constants/sensitive-keywords.constants.js';
import {
  highRiskValuePatterns,
  keyedSecretPatterns,
  optionalPiiPatterns,
} from '../constants/sensitive-patterns.constants.js';

type Strength = 'strong' | 'allow' | 'unknown';

const redactSkipCache = new Map<string, boolean>();

const classifyField = (ctx: {
  key?: string;
  name?: string;
  label?: string;
  type?: string;
}): 'strong' | 'allow' | 'unknown' => {
  const hay = [ctx.key, ctx.name, ctx.label, ctx.type].filter(Boolean).join(' ').toLowerCase();
  if (keyMatches(hay, STRONG_KEYS)) return 'strong';
  if (keyMatches(hay, EXEMPT_KEYS)) return 'allow';
  if (keyMatches(hay, NON_SENSITIVE_KEYS)) return 'allow';

  return 'unknown';
};

/**
 * Applies redaction rules to a raw string using defined regex patterns.
 * @param value - The string to redact.
 * @returns Redacted string.
 */
const redactString = (value: string, ctxStrength: Strength): string => {
  if (!value || ctxStrength === 'allow') return value;

  const pass = (patterns: { pattern: RegExp; groupIndex?: number }[]) => {
    for (const { pattern, groupIndex } of patterns) {
      const out = value.replace(pattern, (...args) => {
        if (groupIndex !== undefined && args[groupIndex]) {
          const full = args[0];
          return full.replace(args[groupIndex], REDACTED_KEYWORD);
        }
        return REDACTED_KEYWORD;
      });
      if (out !== value) return out;
    }
    return value;
  };

  let out = pass(highRiskValuePatterns);
  if (out !== value) return out;

  out = pass(keyedSecretPatterns);
  if (out !== value) return out;

  if (ctxStrength === 'strong') {
    out = pass(optionalPiiPatterns);
  }
  return out;
};

/** Redact a string that may contain JSON while preserving string type. */
const redactPossiblyJsonString = (
  input: string,
  shouldSkipRedaction: boolean,
  ctx?: { strength: Strength },
): string => {
  const trimmed = input.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(input);
      const redacted = deepRedactInternal(parsed, shouldSkipRedaction, ctx);
      return JSON.stringify(redacted);
    } catch {
      return redactString(input, ctx?.strength ?? 'unknown');
    }
  }
  return redactString(input, ctx?.strength ?? 'unknown');
};

/**
 * Determines if an object contains a context where `name` matches a sensitive key.
 * @param obj - The object to inspect.
 * @returns True if the context suggests sensitive data.
 */
const shouldRedactByNameValueContext = (obj: any): boolean => {
  const name = typeof obj?.name === 'string' ? obj.name : undefined;
  const key = typeof obj?.key === 'string' ? obj.key : undefined;

  return keyMatches(name, STRONG_KEYS) || keyMatches(key, STRONG_KEYS);
};

/**
 * Internal recursive function that redacts sensitive values.
 * @param input - Any data.
 * @param shouldSkipRedaction - If true, redaction is bypassed entirely.
 * @param ctx - Optional context (derived from key/name/label/type).
 */
const deepRedactInternal = (input: any, shouldSkipRedaction: boolean, ctx?: { strength: Strength }): any => {
  if (shouldSkipRedaction || input === null || input === undefined) return input;

  if (typeof input === 'string') {
    return redactPossiblyJsonString(input, shouldSkipRedaction, ctx);
  }

  if (Array.isArray(input)) {
    return input.map(item => deepRedactInternal(item, shouldSkipRedaction, ctx));
  }

  if (typeof input !== 'object') return input;

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    // Build field-level context
    const fieldCtx = {
      key,
      name: typeof (input as any).name === 'string' ? (input as any).name : undefined,
      label: typeof (input as any).label === 'string' ? (input as any).label : undefined,
      type: typeof (input as any).type === 'string' ? (input as any).type : undefined,
    };
    const strength = classifyField(fieldCtx); // 'strong' | 'allow' | 'unknown'

    // CASE 1: value in { key: "secret", value: "..." }
    if (key === 'value' && typeof value === 'string') {
      const nameKeyStrong =
        shouldRedactByNameValueContext(input) ||
        keyMatches((input as any).key, STRONG_KEYS) ||
        keyMatches((input as any).name, STRONG_KEYS);

      if (nameKeyStrong) {
        result[key] = REDACTED_KEYWORD;
        continue;
      }
      result[key] = deepRedactInternal(value, shouldSkipRedaction, { strength });
      continue;
    }

    // CASE 2: key-value pairs like { secret: "..." }
    if (typeof key === 'string' && typeof value === 'string') {
      if (keyMatches(key, STRONG_KEYS)) {
        result[key] = REDACTED_KEYWORD;
        continue;
      }
      if (keyMatches(key, EXEMPT_KEYS) || keyMatches(key, NON_SENSITIVE_KEYS)) {
        // explicitly allowed by name
        result[key] = value;
        continue;
      }
      // otherwise process string with context
      result[key] = deepRedactInternal(value, shouldSkipRedaction, { strength });
      continue;
    }

    // Recurse for nested structures, propagate context strength for this field
    result[key] = deepRedactInternal(value, shouldSkipRedaction, { strength });
  }

  return result;
};

/**
 * Deeply redacts sensitive information from an input structure.
 * Automatically skips redaction in non-production environments.
 * Uses cache when `uuid` is available on the object.
 *
 * @param input - Any value (object, array, string, etc.) to redact.
 * @param url - Optional URL to determine if redaction should apply (e.g. non-prod).
 * @returns Redacted copy of the input.
 */
export const deepRedactSensitiveInfo = (input: any, url?: string): any => {
  const nonProd = isNonProduction(url);
  const cacheKey =
    input && typeof input === 'object' && input.uuid ? `${input.uuid}::${nonProd ? 'nonprod' : 'prod'}` : undefined;

  let shouldSkipRedaction = false;

  if (cacheKey) {
    const cached = redactSkipCache.get(cacheKey);
    if (cached !== undefined) {
      shouldSkipRedaction = cached;
    } else {
      shouldSkipRedaction = nonProd;
      redactSkipCache.set(cacheKey, shouldSkipRedaction);
    }
  } else {
    shouldSkipRedaction = nonProd;
  }

  return deepRedactInternal(input, shouldSkipRedaction);
};
