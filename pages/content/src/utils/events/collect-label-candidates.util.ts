export const collectLabelCandidates = (el: Element): HTMLElement[] => {
  const cands: Set<HTMLElement> = new Set();

  const push = (n: Element | null | undefined) => {
    if (n && n instanceof HTMLElement) cands.add(n);
  };

  push(el);

  push(el.closest?.('[id]'));

  push(el.closest?.('[role="combobox"]'));
  push(el.closest?.('[role="listbox"]'));
  push(el.closest?.('[role="textbox"]'));

  push(
    el.querySelector?.('input[id], select[id], textarea[id], button[id], [role="combobox"][id], [role="textbox"][id]'),
  );

  // React-Select renders the real <input> inside a wrapper class — without this, the visible
  // combobox div has no usable id.
  const reactSelectRoot = el.closest?.('.react-select-container');
  push(reactSelectRoot?.querySelector?.('input[id]'));

  return Array.from(cands);
};
