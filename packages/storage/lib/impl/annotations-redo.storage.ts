import type { Annotations } from './annotations.storage.js';
import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorage } from '../base/types.js';

type RedoMap = Record<string, Annotations>;
type AnnotationsRedoStorage = BaseStorage<RedoMap> & {
  setAnnotations: (id: string, annotations: Annotations) => Promise<void>;
  getAnnotations: (id: string) => Promise<Annotations | null>;
  deleteAnnotations: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
};
const storage = createStorage<RedoMap>(
  'annotations-redo-storage-key',
  {},
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const annotationsRedoStorage: AnnotationsRedoStorage = {
  ...storage,

  async setAnnotations(id, annotations) {
    const map = await storage.get();
    const previous = map[id] ?? {};

    map[id] = {
      ...previous,
      ...(annotations?.objects && { objects: annotations.objects }),
      ...(annotations?.meta && { meta: annotations.meta }),
    };

    await storage.set(map);
  },

  async getAnnotations(id) {
    const map = await storage.get();
    return map[id] ?? null;
  },

  async deleteAnnotations(id) {
    const map = await storage.get();

    if (id in map) {
      delete map[id];
      await storage.set(map);
    }
  },

  async clearAll() {
    await storage.set({});
  },
};
