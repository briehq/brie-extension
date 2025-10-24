/**
 * Finds the closest ancestor <form> for an element.
 * @param el - Starting element (may be null).
 * @returns The nearest HTMLFormElement, or null if none.
 */
export const closestForm = (el: Element | null): HTMLFormElement | null => {
  for (let n = el; n; n = n.parentElement) if (n instanceof HTMLFormElement) return n;

  return null;
};
