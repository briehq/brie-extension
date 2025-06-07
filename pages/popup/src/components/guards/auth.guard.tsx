import type { PropsWithChildren } from 'react';

import { useStorage } from '@extension/shared';
import { authTokensStorage } from '@extension/storage';

import { AuthView } from '../ui';

export const AuthGuard: React.FC<PropsWithChildren> = ({ children }) => {
  const tokens = useStorage(authTokensStorage);

  if (!tokens?.accessTokens) return <AuthView />;

  return <>{children}</>;
};
