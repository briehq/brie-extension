import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorage } from '../base/types.js';

type PendingReloadTabsStorage = BaseStorage<number[]> & {
  add: (tabId: number) => Promise<void>;
  remove: (tabId: number) => Promise<void>;
  includes: (tabId: number) => Promise<boolean>;
  getAll: () => Promise<number[]>;
};

const storage = createStorage<number[]>(
  'pending-reload-tabs-storage-key',
  [], // default empty array
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const pendingReloadTabsStorage: PendingReloadTabsStorage = {
  ...storage,

  add: async (tabId: number) => {
    await storage.set(prev => {
      const current = prev ?? [];
      return current.includes(tabId) ? current : [...current, tabId];
    });
  },

  remove: async (tabId: number) => {
    const current = (await storage.get()) || [];
    const updated = current.filter(id => id !== tabId);
    await storage.set(updated);
  },

  includes: async (tabId: number) => {
    const current = (await storage.get()) || [];
    return current.includes(tabId);
  },

  getAll: async () => {
    return await storage.get();
  },
};
