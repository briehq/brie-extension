import { deepTarget } from './deep-target.util';
import { isClickable } from './is-clickable.util';

/**
 * Finds the first clickable element in the event path or ancestor chain.
 * @param event - The DOM event (uses composedPath and fallback parent walk).
 * @returns The first clickable Element or null.
 */
export const findClickableInPath = (event: Event): Element | null => {
  const paths = (event.composedPath?.() ?? []) as Array<EventTarget>;

  for (const path of paths) {
    if (path instanceof Element && isClickable(path)) return path;
  }

  for (let el = deepTarget(event)?.parentElement; el; el = el.parentElement) {
    if (isClickable(el)) return el;
  }

  return null;
};
