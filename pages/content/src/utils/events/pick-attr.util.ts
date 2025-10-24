/**
 * Gets the first non-empty value among the given attribute names on an element.
 * @param el - Target element to read attributes from.
 * @param names - Attribute names to check in order.
 * @returns The trimmed value if found; otherwise null.
 */
export const pickAttr = (el: Element, names: string[]): string | null => {
  for (const n of names) {
    const v = (el as HTMLElement).getAttribute?.(n) ?? (el as any)[n];
    if (typeof v === 'string' && v.trim().length) return v.trim();
  }

  return null;
};
