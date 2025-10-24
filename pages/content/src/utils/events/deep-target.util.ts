/**
 * Returns the first Element from the event's composed path.
 * @param event - The DOM event (works with Shadow DOM).
 * @returns The deepest Element target, or null if none.
 */
export const deepTarget = (event: Event): Element | null => {
  const path = (event.composedPath?.() ?? []) as Array<EventTarget>;

  for (const t of path) {
    if (t && (t as Element).nodeType === Node.ELEMENT_NODE) {
      return t as Element;
    }
  }

  const t = event.target as Element | null;

  return t?.nodeType === Node.ELEMENT_NODE ? t : null;
};
