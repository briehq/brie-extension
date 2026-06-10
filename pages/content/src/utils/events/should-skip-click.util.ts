export const shouldSkipClick = (target: HTMLElement): boolean => {
  const tagName = target.tagName.toUpperCase();
  const inputType = target.getAttribute('type')?.toLowerCase();

  if (tagName === 'INPUT' && ['checkbox', 'radio'].includes(inputType || '')) {
    return true;
  }

  const role = target.getAttribute('role');
  if (['checkbox', 'switch'].includes(role || '')) {
    return true;
  }

  if (tagName === 'BODY') return true;

  const isEditable =
    tagName === 'TEXTAREA' ||
    (tagName === 'INPUT' && !['button', 'submit', 'reset'].includes(inputType || '')) ||
    target.getAttribute('contenteditable') === 'true';

  if (isEditable) return true;

  const inputWrapper = target.closest('label, .input-wrapper, .input-icon, .form-field');
  const isInsideInputWrapper = inputWrapper?.querySelector('input, textarea, [contenteditable="true"]');

  if (isInsideInputWrapper) return true;

  return false;
};
