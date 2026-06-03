// Function to get description from an element (supports label, input, etc.)
export const getElementDescription = (element: Element | null) => {
  let description = null;

  if (!(element instanceof HTMLElement) || ['BODY', 'DIV'].includes(element?.tagName)) {
    return description; // Ensure element is a valid DOM element
  }

  // Check if the element is wrapped inside a label
  const label = element?.closest('label');

  if (label) {
    description = label.innerText || label.getAttribute('aria-label');
  }

  // Check for relevant ARIA attributes directly on the element
  if (!description) {
    const ariaLabel = element.getAttribute('aria-label');
    const ariaDescribedBy = element.getAttribute('aria-describedby');
    const ariaRole = element.getAttribute('role');

    // Combine the ARIA attributes into a descriptive string
    description = ariaLabel || ariaDescribedBy || ariaRole;
  }

  // If no ARIA attributes or labels are found, fallback to the element's inner text or a generic description
  if (!description) {
    description = element.innerText || element.getAttribute('title');
  }

  return description;
};
