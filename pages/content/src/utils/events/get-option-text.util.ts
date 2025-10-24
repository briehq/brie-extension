/**
 * Extracts a readable value for a custom select option element.
 *
 * Extraction priority:
 * 1. `data-value`
 * 2. `aria-label`
 * 3. `innerText` / `textContent`
 *
 * Trims whitespace and truncates to 120 characters.
 *
 * @param opt - The option element.
 * @returns The extracted text value or null if empty.
 */
export const getOptionText = (opt: HTMLElement): string | null => {
  const raw =
    opt.getAttribute('data-value') || opt.getAttribute('aria-label') || opt.innerText || opt.textContent || '';
  const trimmed = raw.replace(/\s+/g, ' ').trim();

  return trimmed ? (trimmed.length > 120 ? trimmed.slice(0, 119) + '…' : trimmed) : null;
};
