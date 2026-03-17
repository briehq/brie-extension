export const isInternalUrl = (url: string | undefined | null): boolean => {
  if (!url) return false;
  return url.startsWith('about:') || url.startsWith('chrome:');
};
