import { isModifier } from './is-modifier.util';

/**
 * Builds a normalized shortcut chord (e.g., "Ctrl+Meta+K") or null for bare modifiers.
 * Uppercases single-letter base keys and preserves named keys (Enter, Escape, ArrowLeft, etc.).
 * @param e - Keyboard event to inspect.
 * @returns The chord string, or null if only a modifier was pressed.
 */
export const buildChord = (e: KeyboardEvent): string | null => {
  // ignore bare modifiers
  if (isModifier(e.key)) return null;

  const parts: string[] = [];

  if (e.ctrlKey) parts.push('Ctrl');
  if (e.metaKey) parts.push('Meta');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');

  parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);

  return parts.join('+');
};
