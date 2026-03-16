import type { HoverRect } from '../../models';

export const getRectCoords = (el: Element | null): HoverRect | null => {
  if (!el) return null;

  const rect = el.getBoundingClientRect();

  if (!rect.width || !rect.height) return null;

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
};
