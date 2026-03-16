export const isPageRoot = (el: Element | null): boolean => {
  if (!el) return false;
  return el === document.documentElement || el === document.body;
};
