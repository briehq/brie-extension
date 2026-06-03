/**
 * Returns a shallow copy with only defined (non-null/null) fields.
 * @typeParam T - Object type to filter.
 * @param obj - Source object.
 * @returns A new object containing only defined properties.
 */
type NonNullable_<T> = { [K in keyof T]: Exclude<T[K], null | undefined> };

export const pickDefined = <T extends Record<string, unknown>>(obj: T): NonNullable_<T> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out as NonNullable_<T>;
};
