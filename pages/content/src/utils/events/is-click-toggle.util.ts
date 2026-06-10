export const isClickWithinToggle = (el: Element | null, evt?: MouseEvent): boolean => {
  if (!el) return false;

  if (el.closest('input[type="checkbox"], input[type="radio"]')) return true;

  if (el.closest('[role="checkbox"], [role="radio"], [role="switch"]')) return true;

  const label = el.closest('label[for]') as HTMLLabelElement | null;
  if (label?.htmlFor) {
    const ctl = document.getElementById(label.htmlFor) as HTMLInputElement | null;
    if (ctl && ctl.tagName === 'INPUT' && ['checkbox', 'radio'].includes((ctl.type || '').toLowerCase())) {
      return true;
    }
  }

  // Hit-test under the cursor — covers overlays / pointer-events tricks where the visible toggle
  // is not the composedPath target.
  if (evt) {
    const ep = document.elementFromPoint(evt.clientX, evt.clientY);
    if (ep && ep instanceof HTMLElement && ep.closest('input[type="checkbox"], input[type="radio"]')) return true;
  }

  return false;
};
