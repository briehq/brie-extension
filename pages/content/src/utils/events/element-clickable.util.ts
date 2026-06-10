import { CLICKABLE_TAGS } from '@src/constants';

export const isClickableElement = (element: HTMLElement | null): boolean => {
  if (!element) return false;

  const hasRole = element instanceof HTMLElement && element?.getAttribute('role');
  const hasOnClick = typeof (element as any).onclick === 'function';

  return (
    CLICKABLE_TAGS.includes(element.tagName) ||
    (element instanceof HTMLElement && element.hasAttribute('tabindex')) ||
    ['button', 'link', 'option'].includes(hasRole || '') ||
    element?.classList?.contains('cursor-pointer') ||
    hasOnClick
  );
};
