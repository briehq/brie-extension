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

  // Inline handlers only if it *looks* interactive (avoid catching large containers)
  if (typeof (el as any).onclick === 'function') {
    const tabIndexAttr = el.getAttribute('tabindex');
    const tabIndex = tabIndexAttr !== null ? Number(tabIndexAttr) : undefined;
    const cs = getComputedStyle(el);
    const looksInteractive =
      (tabIndex !== undefined && Number.isFinite(tabIndex) && tabIndex >= 0) || cs.cursor === 'pointer';
    if (looksInteractive) return true;
  }

  return false;
};
