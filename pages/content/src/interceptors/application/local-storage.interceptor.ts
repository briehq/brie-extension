import { safePostMessage, MessageType, RecordType, RecordSource } from '@extension/shared';

// Get all localStorage data
export const interceptLocalStorage = () => {
  try {
    const timestamp = Date.now();
    const localStorageData: Record<string, string> = {};

    // Get all keys from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        localStorageData[key] = localStorage.getItem(key) || '';
      }
    }

    // post message to background/content
    safePostMessage(MessageType.ADD_RECORD, {
      timestamp,
      recordType: RecordType.LOCAL_STORAGE,
      source: RecordSource.CLIENT,
      items: localStorageData,
    });
  } catch (error) {
    console.error('Error accessing localStorage:', error);
  }
};
