export const isExtensionElement = (element: HTMLElement): boolean => {
  if (!element) return false;

  return element.closest('#brie-root') !== null;
};
