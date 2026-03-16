import { RECORD, safePostMessage } from '@extension/shared';

// Get all localStorage data
export const interceptLocalStorage = () => {
  const timestamp = Date.now();
  const localStorageData = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue; // Skip null keys

    const value = localStorage.getItem(key);
    localStorageData.push({
      key,
      value,
    });
  }

  safePostMessage(RECORD.ADD, {
    timestamp,
    recordType: 'local-storage',
    source: 'client',
    items: localStorageData,
  });
};
