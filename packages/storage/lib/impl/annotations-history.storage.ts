import { StorageEnum } from '../base/enums.js';
import { createStorage } from '../base/base.js';
import type { BaseStorage } from '../base/types.js';

type AnnotationHistoryStorage = BaseStorage<any> & {
  setHistory: (history: any[]) => Promise<void>;
  getHistory: () => Promise<any[]>;
};

const storage = createStorage<any[]>(
  'annotation-history-storage-key',
  [], // Default is an empty history stack
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: false, // No need for live update in undo history
  },
);

export const annotationHistoryStorage: AnnotationHistoryStorage = {
  ...storage,

  setHistory: async (history: any[]) => {
    await storage.set(history);
  },

  getHistory: async () => {
    return await storage.get();
  },
};
