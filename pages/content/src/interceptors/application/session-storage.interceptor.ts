import { safePostMessage } from '@extension/shared';

// Get all sessionStorage data
export const interceptSessionStorage = () => {
  const timestamp = Date.now();
  const sessionStorageData = [];

  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (!key) continue; // Skip null keys

    const value = sessionStorage.getItem(key);
    sessionStorageData.push({
      key,
      value,
    });
  }

  safePostMessage('ADD_RECORD', {
    timestamp,
    recordType: 'session-storage',
    source: 'client',
    items: sessionStorageData,
  });
};
