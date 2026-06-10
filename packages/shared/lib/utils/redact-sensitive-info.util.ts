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

const shouldRedactByNameValueContext = (obj: any): boolean => {
  const name = typeof obj?.name === 'string' ? obj.name : undefined;
  const key = typeof obj?.key === 'string' ? obj.key : undefined;

  return keyMatches(name, STRONG_KEYS) || keyMatches(key, STRONG_KEYS);
};

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
    const fieldCtx = {
      key,
      name: typeof (input as any).name === 'string' ? (input as any).name : undefined,
      label: typeof (input as any).label === 'string' ? (input as any).label : undefined,
      type: typeof (input as any).type === 'string' ? (input as any).type : undefined,
    };
    const strength = classifyField(fieldCtx);

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

    if (typeof key === 'string' && typeof value === 'string') {
      if (keyMatches(key, STRONG_KEYS)) {
        result[key] = REDACTED_KEYWORD;
        continue;
      }
      if (keyMatches(key, EXEMPT_KEYS) || keyMatches(key, NON_SENSITIVE_KEYS)) {
        result[key] = value;
        continue;
      }
      result[key] = deepRedactInternal(value, shouldSkipRedaction, { strength });
      continue;
    }

    result[key] = deepRedactInternal(value, shouldSkipRedaction, { strength });
  }

  return result;
};

const isSkipDomain = (url?: string, skipDomains?: string[]): boolean => {
  if (!url || !skipDomains || skipDomains.length === 0) return false;

  const lowerUrl = url.toLowerCase();
  return skipDomains.some(domain => lowerUrl.includes(domain.toLowerCase()));
};

/**
 * Deeply redacts sensitive information. Skips redaction in non-production
 * environments or when the URL matches a domain in `skipDomains`.
 */
export const deepRedactSensitiveInfo = (input: any, url?: string, skipDomains?: string[]): any => {
  const shouldSkipRedaction = isNonProduction(url) || isSkipDomain(url, skipDomains);
  return deepRedactInternal(input, shouldSkipRedaction);
};
