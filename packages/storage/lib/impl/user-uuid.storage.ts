import { v4 as uuidv4 } from 'uuid';

import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorage } from '../base/types.js';

type UserUUIDStorage = BaseStorage<string | null> & {
  setUUID(uuid: string | null): Promise<void>;
  getUUID(): Promise<string>;
};

const storage = createStorage<string | null>('user-uuid-storage-key', null, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const userUUIDStorage: UserUUIDStorage = {
  ...storage,

  /**
   * Persist a UUID string (or `null` to clear it).
   * @param uuid - The value to store.
   */
  async setUUID(uuid) {
    await storage.set(uuid);
  },

  /**
   * Retrieve the stored UUID.
   * If none exists, a new one is generated, saved, and returned.
   * @returns A guaranteed UUID string.
   */
  async getUUID() {
    let uuid = await storage.get();

    if (!uuid) {
      uuid = uuidv4();
      await storage.set(uuid);
    }

    return uuid;
  },
};
