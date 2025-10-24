/** Return trimmed text (bounded), ignoring excessive whitespace. */
export const readText = (el: Element | null, max = 120): string | null => {
  if (!el) return null;
  const txt = ((el as HTMLElement).innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  if (!txt) return null;
  return txt.length > max ? txt.slice(0, max - 1) + '…' : txt;
};
