/**
 * Determines if an element is likely user-clickable.
 * @param el - Element to test (nullable).
 * @returns True if clickable; otherwise false.
 */
export const isClickable = (el: Element | null): boolean => {
  if (!el) return false;

  const tag = el.tagName;
  const role = el.getAttribute?.('role')?.toLowerCase();
  const type = el.getAttribute?.('type')?.toLowerCase();

  if (['BUTTON', 'A', 'SUMMARY'].includes(tag)) return true;

  if (tag === 'INPUT' && ['button', 'submit', 'image', 'checkbox', 'radio'].includes(type ?? '')) return true;

  if (role && ['button', 'link', 'menuitem', 'tab', 'option', 'switch'].includes(role)) return true;

  // Inline handlers: any element with an `onclick` is treated as clickable.
  // Previously a `cursor: pointer` check via getComputedStyle gated this, but the recalc cost on
  // every click event was too high — accept slightly broader matching instead.
  if (typeof (el as unknown as { onclick?: unknown }).onclick === 'function') return true;

  return false;
};
