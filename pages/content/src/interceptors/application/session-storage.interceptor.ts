import { safePostMessage, MessageType, RecordType, RecordSource } from '@extension/shared';

// Get all sessionStorage data
export const interceptSessionStorage = () => {
  try {
    const timestamp = Date.now();
    const sessionStorageData: Record<string, string> = {};

    // Get all keys from sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        sessionStorageData[key] = sessionStorage.getItem(key) || '';
      }
    }

    // post message to background/content
    safePostMessage(MessageType.ADD_RECORD, {
      timestamp,
      recordType: RecordType.SESSION_STORAGE,
      source: RecordSource.CLIENT,
      items: sessionStorageData,
    });
  } catch (error) {
    console.error('Error accessing sessionStorage:', error);
  }
};
