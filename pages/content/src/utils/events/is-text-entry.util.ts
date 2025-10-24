/**
 * Checks if an element is a text-entry control.
 *
 * Text-entry controls include:
 * - Text-like `<input>` types (text, search, email, etc.)
 * - `<textarea>`
 * - Elements with contenteditable=true
 * - Elements with ARIA roles like textbox or combobox
 *
 * @param el - The element to evaluate.
 * @returns True if the element allows text input; otherwise false.
 */
export const isTextEntry = (el: Element | null): boolean => {
  if (!el) return false;
  const h = el as HTMLElement;
  if (h.isContentEditable) return true;

  const tag = h.tagName;
  const type = (h.getAttribute?.('type') || '').toLowerCase();
  const role = (h.getAttribute?.('role') || '').toLowerCase();

  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') {
    // non-text inputs are explicitly excluded
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
    return true; // text, search, email, number, password, tel, url, etc.
  }
  return role === 'textbox' || role === 'combobox';
};
