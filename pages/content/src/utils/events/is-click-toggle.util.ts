/** True if the click occurs in or targets a checkbox/radio/switch control (native or custom). */
export const isClickWithinToggle = (el: Element | null, evt?: MouseEvent): boolean => {
  if (!el) return false;

  // A) Native inputs nearby
  if (el.closest('input[type="checkbox"], input[type="radio"]')) return true;

  // B) ARIA toggles
  if (el.closest('[role="checkbox"], [role="radio"], [role="switch"]')) return true;

  // C) Label → input association
  const label = el.closest('label[for]') as HTMLLabelElement | null;
  if (label?.htmlFor) {
    const ctl = document.getElementById(label.htmlFor) as HTMLInputElement | null;
    if (ctl && ctl.tagName === 'INPUT' && ['checkbox', 'radio'].includes((ctl.type || '').toLowerCase())) {
      return true;
    }
  }

  // D) Hit-tested input under cursor (covers overlays/pointer-events tricks)
  if (evt) {
    const ep = document.elementFromPoint(evt.clientX, evt.clientY);
    if (ep && ep instanceof HTMLElement && ep.closest('input[type="checkbox"], input[type="radio"]')) return true;
  }

  return false;
};
