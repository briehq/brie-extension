import type { PropsWithChildren } from 'react';

import { AuthMethod } from '@extension/shared';
import { useUser } from '@extension/store';

import { AuthView, Skeleton } from '../components/ui';

export const AuthGuard: React.FC<PropsWithChildren> = ({ children }) => {
  const { fields, isLoading, isFetching, isUninitialized } = useUser();

  if (isUninitialized || isLoading || isFetching) {
    return <Skeleton />;
  }

  if (!fields?.id || fields.authMethod === AuthMethod.GUEST) {
    return <AuthView />;
  }

  return children;
};
