import { isNonProduction, redactSensitiveInfo } from '@extension/shared';

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
      value: isNonProduction() ? value : redactSensitiveInfo(key, value),
    });
  }

  window.postMessage(
    {
      type: 'ADD_RECORD',
      payload: { timestamp, recordType: 'session-storage', source: 'client', items: sessionStorageData },
    },
    '*',
  );
};
