import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorage } from '../base/types.js';

type AnnotationsRedoStorage = BaseStorage<any> & {
  setAnnotations: (state: any) => Promise<void>;
  getAnnotations: () => Promise<any>;
};

const storage = createStorage<any>(
  'annotations-redo-storage-key',
  [], // Default state is idle
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const annotationsRedoStorage: AnnotationsRedoStorage = {
  ...storage,

  setAnnotations: async (state: any) => {
    await storage.set(state);
  },

  getAnnotations: async () => {
    return await storage.get();
  },
};
