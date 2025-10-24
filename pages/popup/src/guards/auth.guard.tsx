import type { PropsWithChildren } from 'react';

import { AuthMethod, useStorage } from '@extension/shared';
import { authTokensStorage } from '@extension/storage';
import { useUser } from '@extension/store';

import { AuthView } from '../components/ui';

export const AuthGuard: React.FC<PropsWithChildren> = ({ children }) => {
  const tokens = useStorage(authTokensStorage);
  const user = useUser();

  if (!tokens?.accessToken || user?.fields?.authMethod === AuthMethod.GUEST) return <AuthView />;

  return children;
};
