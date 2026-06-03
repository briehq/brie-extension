import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import type { AuthState } from '../hooks/use-auth-state.hook';
import { useAuthState } from '../hooks/use-auth-state.hook';

const AuthStateContext = createContext<AuthState | null>(null);

export const AuthStateProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const authState = useAuthState();

  // Memoize the context value so consumers don't re-render on every Provider render — only when
  // one of phase / user / retry actually changes.
  const value = useMemo(
    () => authState,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authState.phase, authState.user, authState.retry],
  );

  return <AuthStateContext.Provider value={value}>{children}</AuthStateContext.Provider>;
};

export const useAuthStateContext = (): AuthState => {
  const context = useContext(AuthStateContext);

  if (!context) {
    throw new Error('useAuthStateContext must be used within an AuthStateProvider');
  }

  return context;
};
