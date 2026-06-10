import { isExtensionElement } from '@extension/shared';

export const pathTouchesExtension = (event: Event): boolean => {
  const path = (event.composedPath?.() ?? []) as Array<EventTarget>;

  return path.some(n => n instanceof HTMLElement && isExtensionElement(n));
};
