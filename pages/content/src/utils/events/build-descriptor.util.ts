import type { ElementDescriptor } from '@src/interfaces/events';

import { getAssociatedLabelText } from './get-associated-label.util';
import { pickAttr } from './pick-attr.util';
import { pickDefined } from './pick-defined.util';

/**
 * Creates a stable, minimal descriptor for an element.
 * Adds common attributes used for identification while avoiding duplicates.
 * @param el - Element to describe (supports null/null).
 * @returns An ElementDescriptor or null if no element.
 */
export const buildDescriptor = (el?: Element | null): ElementDescriptor | null => {
  if (!el) return null;

  const isForm = el instanceof HTMLFormElement;
  const isAnchor = el instanceof HTMLAnchorElement;
  const isInput = el instanceof HTMLInputElement;
  const isTextarea = el instanceof HTMLTextAreaElement;
  const isSelect = el instanceof HTMLSelectElement;

  const type = pickAttr(el, ['type']);
  const label = isInput && type === 'submit' ? ((el as HTMLInputElement).value ?? '') : getAssociatedLabelText(el);

  const textContent = (() => {
    const raw =
      el.getAttribute?.('aria-label') ||
      el.getAttribute?.('data-label') ||
      (el as HTMLButtonElement).innerText ||
      (!(isInput || isTextarea) ? el.textContent : '');
    const trimmed = raw.replace(/\s+/g, ' ').trim();
    return trimmed ? (trimmed.length > 120 ? trimmed.slice(0, 119) + '…' : trimmed) : null;
  })();

  const disabled =
    (isInput && (el as HTMLInputElement).disabled) ||
    (isSelect && (el as HTMLSelectElement).disabled) ||
    el.hasAttribute?.('disabled')
      ? true
      : null;

  const sizeAttr =
    (isInput && (el as HTMLInputElement).size ? (el as HTMLInputElement).size : null) ??
    (el.getAttribute?.('size') ? Number(el.getAttribute('size')) : null);

  const className =
    typeof el.className === 'string' && el.className.trim().length && el.className.length <= 120
      ? el.className.trim()
      : null;

  return pickDefined<
    ElementDescriptor & {
      tagName?: string;
      className?: string;
      href?: string;
      action?: string;
      method?: string;
      target?: string;
      ariaDescribedby?: string;
      dataLabel?: string;
      contentEditable?: boolean;
      disabled?: boolean;
      size?: number;
      textContent?: string;
      src?: string;
    }
  >({
    tagName: el.tagName,
    id: el.id || null,
    dataTestId: pickAttr(el, ['data-testid', 'dataTestid', 'data-test-id']),
    role: pickAttr(el, ['role']),
    name: pickAttr(el, ['name']),
    type,
    src: pickAttr(el, ['src']),
    ariaLabel: pickAttr(el, ['aria-label']),
    ariaDescribedby: pickAttr(el, ['aria-describedby']),
    dataLabel: pickAttr(el, ['data-label']),
    label,
    title: pickAttr(el, ['title']),
    href: isAnchor ? (el as HTMLAnchorElement).href || null : pickAttr(el, ['href']),
    action: isForm ? (el as HTMLFormElement).action || null : pickAttr(el, ['action']),
    method: isForm ? ((el as HTMLFormElement).method || '').toUpperCase() || null : pickAttr(el, ['method']),
    target: pickAttr(el, ['target']),
    className,
    contentEditable: (el as any)?.isContentEditable,
    disabled,
    size: Number.isFinite(sizeAttr as number) ? (sizeAttr as number) : null,
    textContent,
    placeholder: pickAttr(el, ['placeholder']),
  });
};
