import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorage } from '../base/types.js';

type Annotations = any[];
type RedoMap = Record<string, Annotations>;
type AnnotationsRedoStorage = BaseStorage<RedoMap> & {
  setAnnotations: (id: string, annotations: Annotations) => Promise<void>;
  getAnnotations: (id: string) => Promise<Annotations>;
  deleteAnnotations: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
};
const storage = createStorage<RedoMap>(
  'annotations-redo-storage-key',
  {}, // default → empty map
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const annotationsRedoStorage: AnnotationsRedoStorage = {
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
