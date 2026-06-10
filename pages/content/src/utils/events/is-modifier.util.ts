const MOD_KEYS = new Set(['Control', 'Meta', 'Alt', 'Shift']);

export const isModifier = (k: string) => MOD_KEYS.has(k);
