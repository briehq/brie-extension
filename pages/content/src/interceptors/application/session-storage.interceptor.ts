import { RECORD, safePostMessage } from '@extension/shared';

export const interceptSessionStorage = () => {
  const timestamp = Date.now();
  const sessionStorageData = [];

  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (!key) continue;

    const value = sessionStorage.getItem(key);
    sessionStorageData.push({
      key,
      value,
    });
  }

  safePostMessage(RECORD.ADD, {
    timestamp,
    recordType: 'session-storage',
    source: 'client',
    items: sessionStorageData,
  });
};
