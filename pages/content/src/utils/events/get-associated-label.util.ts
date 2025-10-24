import { collectLabelCandidates } from './collect-label-candidates.util';
import { readText } from './read-text.util';
import { cssEscape } from './safe-css-escape.util';

/**
 * Resolves a human label for a control (native or custom).
 * Priority:
 * 1) aria-labelledby (on candidates)
 * 2) <label for="id"> (for any candidate with id)
 * 3) wrapping <label> ancestor
 * 4) nearest <legend> of enclosing <fieldset>
 * 5) heuristic siblings: explicit <label>, or label-like siblings/data-label/aria-label
 *
 * @param el - The element you’re describing (may be a child wrapper; function finds real control too).
 * @returns The resolved label text or null.
 */
export const getAssociatedLabelText = (el: Element): string | null => {
  const candidates = collectLabelCandidates(el);

  // 1) aria-labelledby on any candidate
  for (const c of candidates) {
    const labelledBy = c.getAttribute?.('aria-labelledby');
    if (labelledBy) {
      const txt = labelledBy
        .split(/\s+/)
        .map(id => document.getElementById(id))
        .filter((n): n is HTMLElement => !!n)
        .map(n => readText(n))
        .filter(Boolean)
        .join(' ')
        .trim();
      if (txt) return txt;
    }
  }

  // 2) <label for="id"> using any candidate with id
  for (const c of candidates) {
    const id = c.id;
    if (!id) continue;
    const explicit = document.querySelector(`label[for="${cssEscape(id)}"]`);
    const t = readText(explicit);
    if (t) return t;
  }

  // 3) wrapping <label> (for any candidate)
  for (const c of candidates) {
    const wrapping = c.closest?.('label');
    const tWrap = readText(wrapping);
    if (tWrap) return tWrap;
  }

  // 4) nearest <legend> within enclosing <fieldset> (for any candidate)
  for (const c of candidates) {
    const fs = c.closest?.('fieldset');
    const legend = fs?.querySelector?.(':scope > legend');
    const tLegend = readText(legend as Element);
    if (tLegend) return tLegend;
  }

  // 5) Heuristic siblings of primary candidate (first in set)
  const primary = candidates[0];
  if (primary?.parentElement) {
    // explicit <label> sibling
    const sibLabel = primary.parentElement.querySelector?.(':scope > label');
    const tSib = readText(sibLabel);
    if (tSib) return tSib;

    // label-like siblings
    const likely = primary.parentElement.querySelector?.(
      ':scope > [data-label], :scope > [aria-label], :scope > .label, :scope > [class*="label"]',
    ) as HTMLElement | null;
    const tLikely = readText(likely) || (likely?.getAttribute?.('aria-label') || '').trim() || null;
    if (tLikely) return tLikely;
  }

  // Fallback: own aria-label on any candidate
  for (const c of candidates) {
    const ownAria = c.getAttribute?.('aria-label');
    if (ownAria && ownAria.trim()) return ownAria.trim();
  }

  return null;
};
