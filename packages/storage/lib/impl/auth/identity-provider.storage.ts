import { createStorage } from '../../base/base.js';
import { StorageEnum } from '../../base/enums.js';
import type { BaseStorage } from '../../base/types.js';

export type AuthIdentityProviderStorage = { active: boolean; tabId?: number | null } | null;

/**
 * Persistent flag that says, "A registration window is open"
 */
export const authIdentityProviderStorage: BaseStorage<AuthIdentityProviderStorage> = createStorage(
  'auth-flow-storage-key',
  {} as AuthIdentityProviderStorage,
  { storageEnum: StorageEnum.Local, liveUpdate: true },
);
