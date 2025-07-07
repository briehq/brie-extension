import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorage } from '../base/types.js';

type Annotations = any[];
type HistoryMap = Record<string, Annotations>;
type AnnotationHistoryStorage = BaseStorage<HistoryMap> & {
  setAnnotations: (id: string, annotations: Annotations) => Promise<void>;
  getAnnotations: (id: string) => Promise<Annotations | null>;
  deleteAnnotations: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
};

const storage = createStorage<HistoryMap>(
  'annotation-history-storage-key',
  {}, // default = empty map
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: false, // No need for live update in undo history
  },
);

export const annotationHistoryStorage: AnnotationHistoryStorage = {
  ...storage,

  async setAnnotations(id, annotations) {
    const map = await storage.get();
    map[id] = annotations;
    await storage.set(map);
  },

  async getAnnotations(id) {
    const map = await storage.get();
    return map[id] ?? [];
  },

  async deleteAnnotations(id) {
    const map = await storage.get();
    delete map[id];
    await storage.set(map);
  },

  async clearAll() {
    await storage.set({});
  },
};
