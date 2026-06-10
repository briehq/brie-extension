import { isModifier } from './is-modifier.util';

export const buildChord = (e: KeyboardEvent): string | null => {
  if (isModifier(e.key)) return null;

  const parts: string[] = [];

  if (e.ctrlKey) parts.push('Ctrl');
  if (e.metaKey) parts.push('Meta');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');

  parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);

  return parts.join('+');
};
