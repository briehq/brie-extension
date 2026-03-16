import type { BlurTarget } from '@src/models';

export const createBlurTarget = (el: Element | null): BlurTarget | null => {
  if (!el) return null;

  const rect = el.getBoundingClientRect();

  if (!rect.width || !rect.height) return null;

  return {
    id: `blur-${rect.top}-${rect.left}-${rect.width}-${rect.height}-${Date.now()}`,
    element: el,
  };
};
