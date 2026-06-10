export const getElementDescription = (element: Element | null) => {
  let description = null;

  if (!(element instanceof HTMLElement) || ['BODY', 'DIV'].includes(element?.tagName)) {
    return description;
  }

  const label = element?.closest('label');

  if (label) {
    description = label.innerText || label.getAttribute('aria-label');
  }

  if (!description) {
    const ariaLabel = element.getAttribute('aria-label');
    const ariaDescribedBy = element.getAttribute('aria-describedby');
    const ariaRole = element.getAttribute('role');

    description = ariaLabel || ariaDescribedBy || ariaRole;
  }

  if (!description) {
    description = element.innerText || element.getAttribute('title');
  }

  return description;
};
