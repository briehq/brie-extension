import { collectLabelCandidates } from './collect-label-candidates.util';
import { readText } from './read-text.util';
import { cssEscape } from './safe-css-escape.util';

/**
 * Resolves a human label for a control (native or custom). Resolution order:
 *   1) aria-labelledby   2) <label for="id">   3) wrapping <label>
 *   4) <legend> of enclosing <fieldset>        5) heuristic siblings   6) own aria-label
 */
export const getAssociatedLabelText = (el: Element): string | null => {
  const candidates = collectLabelCandidates(el);

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

  for (const c of candidates) {
    const id = c.id;
    if (!id) continue;
    const explicit = document.querySelector(`label[for="${cssEscape(id)}"]`);
    const t = readText(explicit);
    if (t) return t;
  }

  for (const c of candidates) {
    const wrapping = c.closest?.('label');
    const tWrap = readText(wrapping);
    if (tWrap) return tWrap;
  }

  for (const c of candidates) {
    const fs = c.closest?.('fieldset');
    const legend = fs?.querySelector?.(':scope > legend');
    const tLegend = readText(legend as Element);
    if (tLegend) return tLegend;
  }

  const primary = candidates[0];
  if (primary?.parentElement) {
    const sibLabel = primary.parentElement.querySelector?.(':scope > label');
    const tSib = readText(sibLabel);
    if (tSib) return tSib;

    const likely = primary.parentElement.querySelector?.(
      ':scope > [data-label], :scope > [aria-label], :scope > .label, :scope > [class*="label"]',
    ) as HTMLElement | null;
    const tLikely = readText(likely) || (likely?.getAttribute?.('aria-label') || '').trim() || null;
    if (tLikely) return tLikely;
  }

  for (const c of candidates) {
    const ownAria = c.getAttribute?.('aria-label');
    if (ownAria && ownAria.trim()) return ownAria.trim();
  }

  return null;
};
