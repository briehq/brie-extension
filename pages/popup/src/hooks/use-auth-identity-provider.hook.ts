import { useCallback, useState } from 'react';
import { runtime } from 'webextension-polyfill';

import { AUTH, useStorage } from '@extension/shared';
import { authIdentityProviderStorage } from '@extension/storage';
import type { AuthIdentityProviderStorage as AuthFlowState } from '@extension/storage';

export const useAuthIdentityProvider = () => {
  const [error, setError] = useState<Error | null>(null);

  const authFlow = useStorage(authIdentityProviderStorage);
  const setAuthFlow = useCallback((state: AuthFlowState | null) => authIdentityProviderStorage.set(state), []);

  const register = useCallback(async () => {
    if (authFlow?.active) return;

    setError(null);
    setAuthFlow({ active: true });

    try {
      const response: any = await runtime.sendMessage({ type: AUTH.START });

      if (!response?.ok) {
        throw new Error(response?.error || 'Auth flow failed');
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setAuthFlow(null);
    }
  }, [authFlow?.active, setAuthFlow]);

  return {
    register,
    isLoading: Boolean(authFlow?.active),
    error,
  };
};
