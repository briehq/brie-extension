import { isClickableElement } from './element-clickable.util';
import { findReactProp } from './find-react-prop.util';

export const findClickableParent = (element: HTMLElement | null, maxDepth: number = 5): HTMLElement | null => {
  let current = element?.parentElement ?? null;
  let depth = 0;

  while (current && depth < maxDepth) {
    if (isClickableElement(current)) {
      const reactProp = findReactProp(current);

      return reactProp ? (current as any)[reactProp] : current;
    }

    current = current.parentElement;
    depth++;
  }

  return null;
};
