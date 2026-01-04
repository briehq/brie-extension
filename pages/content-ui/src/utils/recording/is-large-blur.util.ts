import { isAlmostFullViewport } from './is-full-viewport.util';
import { isPageRoot } from './is-page-root.util';

export const isTooLargeToBlur = (el: Element | null): boolean => {
  if (!el) return false;

  if (isPageRoot(el)) return true;

  if (isAlmostFullViewport(el)) return true;

  return false;
};
