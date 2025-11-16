import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorage } from '../base/types.js';

interface Size {
  width: number;
  height: number;
}

type AnnotationMap = Record<string, Annotations>;

export interface Annotations {
  objects: any[];
  meta?: {
    sizes: {
      natural: Size;
      fit: Size;
    };
    scale: number;
  };
}

export type AnnotationsStorage = BaseStorage<AnnotationMap> & {
  setAnnotations: (id: string, annotations: Annotations) => Promise<void>;
  getAnnotations: (id: string) => Promise<Annotations | null>;
  deleteAnnotations: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
};

/**
 * Factory for annotation map storage with a custom key.
 */
export const createAnnotationStorage = (storageKey: string): AnnotationsStorage => {
  const storage = createStorage<AnnotationMap>(
    storageKey,
    {},
    {
      storageEnum: StorageEnum.Local,
      liveUpdate: true,
    },
  );

  return {
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

      if (!map[id]) return;

      if (map[id]?.objects) {
        map[id] = { ...map[id], objects: [] };
      }

      await storage.set(map);
    },

    async clearAll() {
      await storage.set({});
    },
  };
};
