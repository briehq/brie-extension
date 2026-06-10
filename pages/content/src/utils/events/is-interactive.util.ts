const isVisibleBox = (el: Element): boolean => {
  const r = (el as HTMLElement).getBoundingClientRect?.();
  if (!r) return true; // permissive when layout info is missing
  return r.width > 0 && r.height > 0;
};

const isHeuristicallyClickable = (el: HTMLElement): boolean => {
  const role = el.getAttribute('role')?.toLowerCase();
  const tabIndexAttr = el.getAttribute('tabindex');
  const tabIndex = tabIndexAttr !== null ? Number(tabIndexAttr) : undefined;

  if (tabIndex !== undefined && Number.isFinite(tabIndex) && tabIndex >= 0) return true;

  if (
    role &&
    [
      'button',
      'link',
      'menuitem',
      'option',
      'switch',
      'tab',
      'textbox',
      'slider',
      'spinbutton',
      'combobox',
      'listbox',
      'radio',
      'checkbox',
      'treeitem',
    ].includes(role)
  )
    return true;

  if (el.hasAttribute('aria-expanded') || el.hasAttribute('aria-pressed') || el.hasAttribute('aria-selected')) {
    return true;
  }

  if ((el as unknown as { draggable?: boolean }).draggable === true || el.getAttribute('draggable') === 'true') {
    return true;
  }

  return false;
};

export const isInteractive = (el: Element | null): boolean => {
  if (!el || el === document.body || el === document.documentElement) return false;
  if (!isVisibleBox(el)) return false;

  const h = el as HTMLElement;
  const tag = h.tagName;
  const type = h.getAttribute?.('type')?.toLowerCase();

  if (['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY', 'LABEL', 'DETAILS'].includes(tag)) return true;
  if (
    tag === 'INPUT' &&
    [
      'button',
      'submit',
      'image',
      'checkbox',
      'radio',
      'file',
      'range',
      'color',
      'date',
      'datetime-local',
      'email',
      'number',
      'password',
      'search',
      'tel',
      'text',
      'time',
      'url',
    ].includes(type ?? '')
  )
    return true;

  if (typeof (h as any).onclick === 'function') return true;

  if (isHeuristicallyClickable(h)) return true;

  return false;
};
