export const extractQueryParams = (url: string): Record<string, string> => {
  try {
    const params = new URL(url, window.location.origin).searchParams;
    return Object.fromEntries(params.entries());
  } catch (error) {
    console.error('Error extracting query parameters:', error);
    return {};
  }
};
