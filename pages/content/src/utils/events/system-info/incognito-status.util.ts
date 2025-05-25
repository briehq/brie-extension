/** Detects whether the browser is in incognito mode using the FileSystem API. */
export const getIncognitoStatus = async (): Promise<boolean> => {
  return new Promise(resolve => {
    const fs = window.RequestFileSystem || (window as any).webkitRequestFileSystem;
    if (!fs) {
      resolve(false);
      return;
    }
    fs(
      window.TEMPORARY,
      100,
      () => resolve(false),
      () => resolve(true),
    );
  });
};
