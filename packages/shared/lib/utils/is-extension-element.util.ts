export const isExtensionElement = (element: HTMLElement): boolean => {
  if (!element) return false;

  // Check for your specific extension container IDs
  if (element.closest('#pop-content') || element.closest('#brie-root')) {
    return true;
  }

  // Check for other extension-specific markers
  const extensionMarkers = ['data-brie-extension', 'data-extension-ui', 'brie-extension', 'pop-content', 'brie-root'];

  // Check the element itself
  for (const marker of extensionMarkers) {
    if (
      element.hasAttribute(marker) ||
      element.classList.contains(marker) ||
      element.id === marker ||
      element.id?.includes(marker)
    ) {
      return true;
    }
  }

  // Check if element is within extension shadow DOM
  if (element.closest('[data-brie-extension]') || element.closest('[data-extension-ui]')) {
    return true;
  }

  return false;
};
