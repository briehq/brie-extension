import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorage } from '../base/types.js';

type Annotations = any[];
type AnnotationMap = Record<string, Annotations>;
type AnnotationsStorage = BaseStorage<AnnotationMap> & {
  setAnnotations: (id: string, annotations: Annotations) => Promise<void>;
  getAnnotations: (id: string) => Promise<Annotations>;
  deleteAnnotations: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
};

const storage = createStorage<AnnotationMap>(
  'annotations-storage-key',
  {}, // Default state is idle
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const annotationsStorage: AnnotationsStorage = {
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
