export const shouldSkipInputTracking = (target: HTMLElement): boolean => {
  const inputType = target.getAttribute('type')?.toLowerCase() || '';
  const skipInputTypes = ['button', 'submit', 'reset'];

  return skipInputTypes.includes(inputType);
};
