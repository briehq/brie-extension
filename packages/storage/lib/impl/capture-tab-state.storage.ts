import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorage } from '../base/types.js';

type CaptureTabStorage = BaseStorage<number | null> & {
  setCaptureTabId: (tabId: number | null) => Promise<void>;
  getCaptureTabId: () => Promise<number | null>;
};

const storage = createStorage<number | null>(
  'capture-tab-storage-key',
  null, // Default is no active tab
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const captureTabStorage: CaptureTabStorage = {
  ...storage,

  // Set the capture tabId
  setCaptureTabId: async (tabId: number | null) => {
    await storage.set(tabId);
  },

  // Get the current capture tabId
  getCaptureTabId: async () => {
    return await storage.get();
  },
};
