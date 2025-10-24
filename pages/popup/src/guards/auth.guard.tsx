import type { PropsWithChildren } from 'react';

import { useStorage } from '@extension/shared';
import { authTokensStorage } from '@extension/storage';

import { AuthView } from '../components/ui';

export const AuthGuard: React.FC<PropsWithChildren> = ({ children }) => {
  const tokens = useStorage(authTokensStorage);
  console.log('tokens', tokens);

  if (!tokens?.accessToken) return <AuthView />;

  return children;
};
