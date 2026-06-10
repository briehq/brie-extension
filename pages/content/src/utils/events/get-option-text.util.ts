export const getOptionText = (opt: HTMLElement): string | null => {
  const raw =
    opt.getAttribute('data-value') || opt.getAttribute('aria-label') || opt.innerText || opt.textContent || '';
  const trimmed = raw.replace(/\s+/g, ' ').trim();

  return trimmed ? (trimmed.length > 120 ? trimmed.slice(0, 119) + '…' : trimmed) : null;
};
