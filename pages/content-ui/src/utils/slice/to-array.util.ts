/**
 * Converts the provided value into a safe array.
 *
 * @param v - A possible array or single value.
 *
 * @returns Array<T> - Always an array (or empty array if undefined).
 */
export const toArray = <T>(
  v: T[] | ReadonlyArray<T> | FileList | Iterable<T> | ArrayLike<T> | null | undefined,
): T[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v as T[];

  try {
    return Array.from(v as any);
  } catch {
    return [];
  }
};
