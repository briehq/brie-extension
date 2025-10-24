/**
 * Finds the parent control element associated with an option in a custom select/listbox.
 *
 * Search order:
 * 1. Closest ancestor with role=listbox/combobox/menu
 * 2. `aria-controls` or `aria-owns` references
 * 3. Closest button or element with aria-haspopup
 *
 * @param el - Option element inside a custom select component.
 * @returns The associated control element, or null if not found.
 */
export const findSelectControlForOption = (el: Element): HTMLElement | null => {
  // 1) ARIA: closest role=listbox/combobox
  let n: HTMLElement | null = el as HTMLElement;

  while (n) {
    const role = n.getAttribute?.('role')?.toLowerCase();

    if (role === 'listbox' || role === 'combobox' || role === 'menu') return n;
    n = n.parentElement;
  }

  // 2) aria-controls / aria-owns relationship (option -> listbox id)
  const listId = (el as HTMLElement).getAttribute('aria-controls') || (el as HTMLElement).getAttribute('aria-owns');

  if (listId) {
    const list = document.getElementById(listId);

    if (list instanceof HTMLElement) return list;
  }

  // 3) Fallback: button that opened the popup (common pattern)
  const button = (el as HTMLElement).closest('[aria-haspopup="listbox"],[aria-haspopup="menu"],button');

  return (button as HTMLElement) || null;
};
