import { StorageEnum } from '../base/enums';
import { createStorage } from '../base/base';
import type { BaseStorage } from '../base/types';

interface ITokens {
  accessToken: string;
  refreshToken: string;
}

type AuthTokensStorage = BaseStorage<ITokens> & {
  setTokens: (tokens: ITokens) => Promise<void>;
  getTokens: () => Promise<ITokens>;
};

const storage = createStorage<ITokens>(
  'auth-tokens-storage-key',
  {} as ITokens, // Default is no active tab
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const authTokensStorage: AuthTokensStorage = {
  ...storage,

  setTokens: async (tokens: ITokens) => {
    await storage.set(tokens);
  },

  getTokens: async () => {
    return await storage.get();
  },
};
