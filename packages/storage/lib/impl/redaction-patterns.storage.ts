import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorage } from '../base/types.js';

const MAX_CUSTOM_REDACTION_PATTERNS = 25;

type RedactionPatternsStorage = BaseStorage<string[]> & {
  addPattern: (pattern: string) => Promise<void>;
  removePattern: (pattern: string) => Promise<void>;
};

const storage = createStorage<string[]>('custom-redaction-patterns', [], {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

const redactionPatternsStorage: RedactionPatternsStorage = {
  ...storage,

  async addPattern(pattern: string) {
    const normalized = pattern.trim();
    if (!normalized) return;

    await storage.set(current => {
      if (current.includes(normalized) || current.length >= MAX_CUSTOM_REDACTION_PATTERNS) return current;
      return [...current, normalized];
    });
  },

  async removePattern(pattern: string) {
    await storage.set(current => current.filter(value => value !== pattern));
  },
};

export { MAX_CUSTOM_REDACTION_PATTERNS, redactionPatternsStorage };
