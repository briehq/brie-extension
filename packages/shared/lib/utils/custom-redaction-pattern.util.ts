import { compilePolicy } from 'flare-redact';
import type { Detector } from 'flare-redact';

import { REDACTED_KEYWORD } from '../constants/redacted-keyword.constants.js';

const MAX_PATTERN_LENGTH = 256;
const SAFE_FLAGS = /^[gimsu]*$/;
const BACKREFERENCE = /\\(?:[1-9]|k<[^>]+>)/;
const NESTED_QUANTIFIER = /\([^)]*(?:[+*]|\{\d+(?:,\d*)?\})[^)]*\)(?:[+*]|\{\d+(?:,\d*)?\})/;

interface ParsedRedactionPattern {
  source: string;
  flags: string;
}

type RedactionPatternValidation =
  | { valid: true; parsed: ParsedRedactionPattern }
  | { valid: false; reason: 'empty' | 'too-long' | 'flags' | 'unsafe' | 'empty-match' | 'syntax' };

const isEscaped = (value: string, index: number): boolean => {
  let backslashes = 0;
  for (let i = index - 1; i >= 0 && value[i] === '\\'; i--) backslashes++;
  return backslashes % 2 === 1;
};

const splitExpression = (expression: string): ParsedRedactionPattern | null => {
  const trimmed = expression.trim();
  if (!trimmed) return null;

  if (!trimmed.startsWith('/')) return { source: trimmed, flags: 'gi' };

  let closingSlash = -1;
  for (let i = trimmed.length - 1; i > 0; i--) {
    if (trimmed[i] === '/' && !isEscaped(trimmed, i)) {
      closingSlash = i;
      break;
    }
  }

  if (closingSlash <= 0) return null;
  return {
    source: trimmed.slice(1, closingSlash),
    flags: trimmed.slice(closingSlash + 1),
  };
};

const validateCustomRedactionPattern = (expression: string): RedactionPatternValidation => {
  const trimmed = expression.trim();
  if (!trimmed) return { valid: false, reason: 'empty' };
  if (trimmed.length > MAX_PATTERN_LENGTH) return { valid: false, reason: 'too-long' };

  const parsed = splitExpression(trimmed);
  if (!parsed?.source) return { valid: false, reason: 'syntax' };
  if (!SAFE_FLAGS.test(parsed.flags) || new Set(parsed.flags).size !== parsed.flags.length) {
    return { valid: false, reason: 'flags' };
  }
  if (BACKREFERENCE.test(parsed.source) || NESTED_QUANTIFIER.test(parsed.source)) {
    return { valid: false, reason: 'unsafe' };
  }

  try {
    const candidate = new RegExp(parsed.source, parsed.flags);
    if (candidate.test('')) return { valid: false, reason: 'empty-match' };
  } catch {
    return { valid: false, reason: 'syntax' };
  }

  return { valid: true, parsed };
};

let cachedKey = '';
let cachedPolicy: ReturnType<typeof compilePolicy> | null = null;

const resolvePolicy = (expressions: string[]) => {
  const parsed = expressions.flatMap(expression => {
    const validation = validateCustomRedactionPattern(expression);
    return validation.valid ? [validation.parsed] : [];
  });
  const key = JSON.stringify(parsed);

  if (key === cachedKey) return cachedPolicy;
  cachedKey = key;

  if (parsed.length === 0) {
    cachedPolicy = null;
    return null;
  }

  const detectors: Detector[] = parsed.map(({ source, flags }, index) => ({
    id: `custom_capture_${index}`,
    label: 'Custom capture pattern',
    why: 'Matches a user-configured local redaction expression.',
    pattern: new RegExp(source, flags),
    default: false,
    risk: 'critical',
  }));

  cachedPolicy = compilePolicy({
    custom: detectors,
    only: detectors.map(detector => detector.id),
    redactKeys: false,
    mask: REDACTED_KEYWORD,
  });
  return cachedPolicy;
};

const redactCustomPatterns = <T>(input: T, expressions: string[] = []): T => {
  const policy = resolvePolicy(expressions);
  return policy ? policy.redact(input) : input;
};

export { redactCustomPatterns, validateCustomRedactionPattern };
export type { ParsedRedactionPattern, RedactionPatternValidation };
