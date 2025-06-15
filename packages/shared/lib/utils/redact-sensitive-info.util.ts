/* eslint-disable @typescript-eslint/no-explicit-any */
import { isNonProduction } from './is-non-production.util.js';
import { REDACTED_KEYWORD } from '../constants/redacted-keyword.constants.js';
import { sensitiveKeywordsPatterns } from '../constants/sensitive-keywords.constants.js';
import { sensitivePatterns } from '../constants/sensitive-patterns.constants.js';

const redactSkipCache = new Map<string, boolean>();

/**
 * Determines if an object contains a context where `name` matches a sensitive key.
 * @param obj - The object to inspect.
 * @returns True if the context suggests sensitive data.
 */
const shouldRedactByNameValueContext = (obj: any): boolean => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.name === 'string' &&
    typeof obj.value === 'string' &&
    sensitiveKeywordsPatterns.some(({ pattern }) => pattern.test(obj.name))
  );
};

/**
 * Applies redaction rules to a raw string using defined regex patterns.
 * @param value - The string to redact.
 * @returns Redacted string.
 */
const safeRedact = (value: string): string => {
  let result = value;

  for (const { pattern, groupIndex } of sensitivePatterns) {
    result = result.replace(pattern, (...args) => {
      if (groupIndex !== undefined && args[groupIndex]) {
        const fullMatch = args[0];
        const sensitivePart = args[groupIndex];
        return fullMatch.replace(sensitivePart, REDACTED_KEYWORD);
      }
      return REDACTED_KEYWORD;
    });
  }

  return result;
};

/**
 * Internal recursive function that redacts sensitive values.
 * @param input - The object/string/array to process.
 * @param shouldSkipRedaction - If true, redaction is bypassed.
 * @returns Redacted version of the input.
 */
const deepRedactInternal = (input: any, shouldSkipRedaction: boolean): any => {
  if (shouldSkipRedaction || !input) return input;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(input);
        return deepRedactInternal(parsed, shouldSkipRedaction);
      } catch {
        return safeRedact(input);
      }
    }
    return safeRedact(input);
  }

  if (Array.isArray(input)) {
    return input.map(item => deepRedactInternal(item, shouldSkipRedaction));
  }

  if (typeof input !== 'object') return input;

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    // value in { key: "secret", value: "..." }
    if (
      key === 'value' &&
      typeof value === 'string' &&
      (shouldRedactByNameValueContext(input) ||
        sensitiveKeywordsPatterns.some(({ pattern }) => pattern.test(input.key)))
    ) {
      result[key] = REDACTED_KEYWORD;
      continue;
    }

    // key-value pairs like { secret: "..." }
    if (
      typeof key === 'string' &&
      typeof value === 'string' &&
      sensitiveKeywordsPatterns.some(({ pattern }) => pattern.test(key))
    ) {
      result[key] = REDACTED_KEYWORD;
      continue;
    }

    result[key] = deepRedactInternal(value, shouldSkipRedaction);
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
  let shouldSkipRedaction = false;

  if (input && typeof input === 'object' && input.uuid) {
    const cached = redactSkipCache.get(input.uuid);
    if (cached !== undefined) {
      shouldSkipRedaction = cached;
    } else {
      shouldSkipRedaction = isNonProduction(url);
      redactSkipCache.set(input.uuid, shouldSkipRedaction);
    }
  } else {
    shouldSkipRedaction = isNonProduction(url);
  }

  return deepRedactInternal(input, shouldSkipRedaction);
};

/**
 * Registers a custom redaction regex pattern for matching sensitive values.
 * @param pattern - The RegExp pattern used for redaction.
 * @param groupIndex - Optional group index in the RegExp to target a submatch.
 */
export const registerCustomRedactionPattern = (pattern: RegExp, groupIndex?: number) => {
  sensitivePatterns.push({ pattern, groupIndex });
};
