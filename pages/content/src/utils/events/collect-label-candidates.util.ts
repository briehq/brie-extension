/** Collect best candidates that might carry the id/role linkage for labeling. */
export const collectLabelCandidates = (el: Element): HTMLElement[] => {
  const cands: Set<HTMLElement> = new Set();

  const push = (n: Element | null | undefined) => {
    if (n && n instanceof HTMLElement) cands.add(n);
  };

  push(el);

  // 1) The closest element that already has an id (often a wrapper/input in custom UIs)
  push(el.closest?.('[id]'));

  // 2) Role containers typical for custom selects
  push(el.closest?.('[role="combobox"]'));
  push(el.closest?.('[role="listbox"]'));
  push(el.closest?.('[role="textbox"]'));

  // 3) First focusable/real control inside this subtree
  push(
    el.querySelector?.('input[id], select[id], textarea[id], button[id], [role="combobox"][id], [role="textbox"][id]'),
  );

  // 4) For React-Select style containers, find the input with id inside the container
  const reactSelectRoot = el.closest?.('.react-select-container');
  push(reactSelectRoot?.querySelector?.('input[id]'));

  return Array.from(cands);
};
