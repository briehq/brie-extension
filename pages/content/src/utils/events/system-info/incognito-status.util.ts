export const getIncognitoStatus = async (): Promise<boolean> => {
  return new Promise(resolve => {
    const w = window as unknown as {
      webkitRequestFileSystem?: (type: number, size: number, success: () => void, error: () => void) => void;
      TEMPORARY?: number;
    };
    const fs = w.webkitRequestFileSystem;
    if (!fs) {
      resolve(false);
      return;
    }
    fs(
      w.TEMPORARY ?? 0,
      100,
      () => resolve(false),
      () => resolve(true),
    );
  });
};
