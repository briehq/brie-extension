export const closestForm = (el: Element | null): HTMLFormElement | null => {
  for (let n = el; n; n = n.parentElement) if (n instanceof HTMLFormElement) return n;

  return null;
};
