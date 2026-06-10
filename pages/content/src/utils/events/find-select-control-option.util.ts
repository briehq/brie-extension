export const findSelectControlForOption = (el: Element): HTMLElement | null => {
  let n: HTMLElement | null = el as HTMLElement;

  while (n) {
    const role = n.getAttribute?.('role')?.toLowerCase();

    if (role === 'listbox' || role === 'combobox' || role === 'menu') return n;
    n = n.parentElement;
  }

  const listId = (el as HTMLElement).getAttribute('aria-controls') || (el as HTMLElement).getAttribute('aria-owns');

  if (listId) {
    const list = document.getElementById(listId);

    if (list instanceof HTMLElement) return list;
  }

  const button = (el as HTMLElement).closest('[aria-haspopup="listbox"],[aria-haspopup="menu"],button');

  return (button as HTMLElement) || null;
};
