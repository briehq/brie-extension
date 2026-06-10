export const isClickable = (el: Element | null): boolean => {
  if (!el) return false;

  const tag = el.tagName;
  const role = el.getAttribute?.('role')?.toLowerCase();
  const type = el.getAttribute?.('type')?.toLowerCase();

  if (['BUTTON', 'A', 'SUMMARY'].includes(tag)) return true;

  if (tag === 'INPUT' && ['button', 'submit', 'image', 'checkbox', 'radio'].includes(type ?? '')) return true;

  if (role && ['button', 'link', 'menuitem', 'tab', 'option', 'switch'].includes(role)) return true;

  if (typeof (el as unknown as { onclick?: unknown }).onclick === 'function') return true;

  return false;
};
