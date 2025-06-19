export const isExtensionElement = (element: HTMLElement): boolean => {
  if (!element) return false;

  // Check for your specific extension container IDs
  if (element.closest('#brie-root')) {
    return true;
  }

  return false;
};
