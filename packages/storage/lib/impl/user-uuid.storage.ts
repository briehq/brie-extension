import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorage } from '../base/types.js';

type UserUUIDStorage = BaseStorage<string | null> & {
  update: (uuid: string | null) => Promise<void>;
  get: () => Promise<string | null>;
};

const storage = createStorage<string | null>(
  'user-uuid-storage-key',
  null, // Default is no active tab
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const userUUIDStorage: UserUUIDStorage = {
  ...storage,

  update: async (uuid: string | null) => {
    await storage.set(uuid);
  },

  get: async () => {
    return await storage.get();
  },
};
