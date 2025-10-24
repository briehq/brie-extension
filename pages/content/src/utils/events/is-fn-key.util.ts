/**
 * Checks if a key represents a function key (e.g., F1–F24).
 * @param k - KeyboardEvent.key value.
 * @returns True if the key is a function key; otherwise false.
 */
export const isFnKey = (k: string) => /^F\d+$/i.test(k);
