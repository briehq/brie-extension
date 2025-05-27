/**
 * Removes fields known to be un-cloneable (like DOM elements) from the object.
 */
export const stripUnCloneable = (data: Record<string, any>) => {
  const clone: Record<string, any> = {};
  for (const key in data) {
    const value = data[key];

    if (value instanceof Node || value instanceof Window || typeof value === 'function') {
      continue;
    }

    clone[key] = value;
  }

  return clone;
};
