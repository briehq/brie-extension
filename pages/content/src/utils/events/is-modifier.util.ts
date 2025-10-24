const MOD_KEYS = new Set(['Control', 'Meta', 'Alt', 'Shift']);

/**
 * Checks if a key is a modifier (Control, Meta, Alt, or Shift).
 * @param k - KeyboardEvent.key value.
 * @returns True if the key is a modifier; otherwise false.
 */
export const isModifier = (k: string) => MOD_KEYS.has(k);
