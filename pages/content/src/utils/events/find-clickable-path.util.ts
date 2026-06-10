import { deepTarget } from './deep-target.util';
import { isClickable } from './is-clickable.util';

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
