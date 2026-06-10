export const isTextEntry = (el: Element | null): boolean => {
  if (!el) return false;
  const h = el as HTMLElement;
  if (h.isContentEditable) return true;

  const tag = h.tagName;
  const type = (h.getAttribute?.('type') || '').toLowerCase();
  const role = (h.getAttribute?.('role') || '').toLowerCase();

  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') {
    if (
      [
        'checkbox',
        'radio',
        'button',
        'submit',
        'image',
        'range',
        'file',
        'color',
        'date',
        'datetime-local',
        'time',
      ].includes(type)
    )
      return false;
    return true;
  }
  return role === 'textbox' || role === 'combobox';
};
