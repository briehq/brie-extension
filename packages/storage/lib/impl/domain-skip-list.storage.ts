import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorage } from '../base/types.js';

type DomainSkipListStorage = BaseStorage<string[]> & {
  addDomain: (domain: string) => Promise<void>;
  removeDomain: (domain: string) => Promise<void>;
};

const storage = createStorage<string[]>('domain-skip-list-storage-key', [], {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const domainSkipListStorage: DomainSkipListStorage = {
  ...storage,

  async addDomain(domain: string) {
    const normalized = domain.trim().toLowerCase();
    if (!normalized) return;

    await storage.set(currentList => {
      if (currentList.includes(normalized)) return currentList;
      return [...currentList, normalized];
    });
  },

  async removeDomain(domain: string) {
    const normalized = domain.trim().toLowerCase();

    await storage.set(currentList => currentList.filter(d => d !== normalized));
  },
};
