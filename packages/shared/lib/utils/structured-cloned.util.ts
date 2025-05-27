import { stripUnCloneable } from './strip-uncloneable.util.js';

/**
 * Attempts a structured clone of an object. Falls back to shallow sanitization
 * by removing common non-serializable fields (like DOM nodes).
 */
export const safeStructuredClone = (input: any) => {
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(input);
    }

    return JSON.parse(JSON.stringify(input));
  } catch {
    return stripUnCloneable(input);
  }
};
