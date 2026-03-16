import type { PropsWithChildren } from 'react';

import { ApiUnavailableView, AuthErrorView, AuthView, Skeleton } from '../components/ui';
import { useAuthStateContext } from '../providers/auth-state.provider';

export const AuthGuard: React.FC<PropsWithChildren> = ({ children }) => {
  const { phase, retry } = useAuthStateContext();

  switch (phase) {
    case 'checking_health':
    case 'checking_auth':
      return <Skeleton />;

    case 'api_unavailable':
      return <ApiUnavailableView onRetry={retry} />;

    case 'error':
      return <AuthErrorView onRetry={retry} />;

    case 'unauthenticated':
      return <AuthView />;

    case 'authenticated':
      return children;
  }
};
