/** Visible, non-zero-size, and not pointer-events:none. */
const isVisibleBox = (el: Element): boolean => {
  const r = (el as HTMLElement).getBoundingClientRect?.();
  if (!r) return true; // be permissive if no layout info
  if (r.width === 0 || r.height === 0) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.pointerEvents !== 'none';
};

/** Heuristic: looks like a custom clickable (e.g., DIV) via cursor/tab/ARIA. */
const isHeuristicallyClickable = (el: HTMLElement): boolean => {
  const role = el.getAttribute('role')?.toLowerCase();
  const tabIndexAttr = el.getAttribute('tabindex');
  const tabIndex = tabIndexAttr !== null ? Number(tabIndexAttr) : undefined;
  const cs = getComputedStyle(el);

  if (cs.cursor === 'pointer') return true;
  if (tabIndex !== undefined && Number.isFinite(tabIndex) && tabIndex >= 0) return true;

  // Common interactive ARIA roles (covers many custom components)
  if (
    role &&
    [
      'button',
      'link',
      'menuitem',
      'option',
      'switch',
      'tab',
      'textbox',
      'slider',
      'spinbutton',
      'combobox',
      'listbox',
      'radio',
      'checkbox',
      'treeitem',
    ].includes(role)
  )
    return true;

  // ARIA interaction hints often present on collapsibles/toggles
  if (el.hasAttribute('aria-expanded') || el.hasAttribute('aria-pressed') || el.hasAttribute('aria-selected')) {
    return true;
  }

  // Draggable often implies interaction
  if ((el as any).draggable === true || el.getAttribute('draggable') === 'true') return true;

  return false;
};

/**
 * Determines whether an element is meaningfully interactive.
 * Accepts native controls and custom interactive DIVs (cursor:pointer, tabindex≥0, ARIA roles/states).
 * Filters out <html>/<body>, invisible boxes, and background containers.
 *
 * @param el - Element to evaluate (nullable).
 * @returns true if interactive; otherwise false.
 */
export const isInteractive = (el: Element | null): boolean => {
  if (!el || el === document.body || el === document.documentElement) return false;
  if (!isVisibleBox(el)) return false;

  const h = el as HTMLElement;
  const tag = h.tagName;
  const type = h.getAttribute?.('type')?.toLowerCase();

  // Native interactive tags
  if (['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY', 'LABEL', 'DETAILS'].includes(tag)) return true;
  if (
    tag === 'INPUT' &&
    [
      'button',
      'submit',
      'image',
      'checkbox',
      'radio',
      'file',
      'range',
      'color',
      'date',
      'datetime-local',
      'email',
      'number',
      'password',
      'search',
      'tel',
      'text',
      'time',
      'url',
    ].includes(type ?? '')
  )
    return true;

  // Direct handler (inline onclick) – keep for legacy pages
  if (typeof (h as any).onclick === 'function') return true;

  // Custom clickable DIVs/spans via heuristics
  if (isHeuristicallyClickable(h)) return true;

  return false;
};
