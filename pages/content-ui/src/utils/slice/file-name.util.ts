/**
 * Creates a file name with a fallback.
 *
 * @param fallback - Default name if missing.
 * @param idx - Index for uniqueness.
 * @param ext - Optional file extension (default: json).
 *
 * @returns string - Safe file name.
 */
export const fileNameOr = (fallback: string, idx: number, ext = 'json') => (fallback ? fallback : `file-${idx}.${ext}`);
