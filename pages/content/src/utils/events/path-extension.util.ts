import { isExtensionElement } from '@extension/shared';

/**
 * Checks whether any node in the event's composed path is part of the extension UI.
 * @param event - The DOM event to inspect.
 * @returns True if the path contains an extension element; otherwise false.
 */
export const pathTouchesExtension = (event: Event): boolean => {
  const path = (event.composedPath?.() ?? []) as Array<EventTarget>;

  return path.some(n => n instanceof HTMLElement && isExtensionElement(n));
};
