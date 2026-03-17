import { createContext, useContext } from 'react';
import type { PropsWithChildren } from 'react';

import type { AuthState } from '../hooks/use-auth-state.hook';
import { useAuthState } from '../hooks/use-auth-state.hook';

const AuthStateContext = createContext<AuthState | null>(null);

export const AuthStateProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const authState = useAuthState();

  return <AuthStateContext.Provider value={authState}>{children}</AuthStateContext.Provider>;
};

export const useAuthStateContext = (): AuthState => {
  const context = useContext(AuthStateContext);

  if (!context) {
    throw new Error('useAuthStateContext must be used within an AuthStateProvider');
  }

  return context;
};
