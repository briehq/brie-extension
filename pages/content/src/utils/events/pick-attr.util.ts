export const pickAttr = (el: Element, names: string[]): string | null => {
  for (const n of names) {
    const v = (el as HTMLElement).getAttribute?.(n) ?? (el as any)[n];
    if (typeof v === 'string' && v.trim().length) return v.trim();
  }

  return null;
};
