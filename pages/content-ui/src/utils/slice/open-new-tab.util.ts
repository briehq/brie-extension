/**
 * Opens a new tab safely and focuses it if allowed.
 *
 * @param url - The target URL to open.
 */
export const safeOpenNewTab = (url: string) => {
  const w = window?.open(url, '_blank');

  try {
    w?.focus();
  } catch {
    //
  }
};
