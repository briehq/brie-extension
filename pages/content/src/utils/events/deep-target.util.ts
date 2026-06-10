/** Composed path crosses Shadow DOM; event.target may not. */
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
