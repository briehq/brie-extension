import { useCallback, useEffect, useState } from 'react';
import { runtime } from 'webextension-polyfill';

import { useStorage } from '@extension/shared';
import { authIdentityProviderStorage } from '@extension/storage';
import type { AuthIdentityProviderStorage as AuthFlowState } from '@extension/storage';

/**
 * Hook that launches the “continue with [auth-provider]” flow
 * and stores the resulting access / refresh tokens.
 *
 * @returns An object with:
 *   • `register()` – call to start the flow
 *   • `isLoading`  – `true` while the browser window is open
 *   • `error`      – any error thrown during the flow
 */
export const useAuthIdentityProvider = () => {
  const [error, setError] = useState<Error | null>(null);

  const authFlow = useStorage(authIdentityProviderStorage);
  const setAuthFlow = useCallback((state: AuthFlowState | null) => authIdentityProviderStorage.set(state), []);

  useEffect(() => {
    setAuthFlow(null);
  }, []);

  /**
   * Launches the authentication flow via background message.
   * Sets active state in storage and handles cleanup automatically.
   */
  const register = useCallback(async () => {
    if (authFlow?.active) return;

    setError(null);
    setAuthFlow({ active: true });

    try {
      const response: any = await runtime.sendMessage({ type: 'AUTH_START' });

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
  }, [authFlow]);

  /**
   * @todo
   * - Verify if these states are working correctly
   * - Check if Chrome login is functioning as expected
   * - Improve logic in background and here in the code
   * - Decide whether to remove or keep `auth-provider.html` logic, then refactor accordingly
   */
  return {
    register,
    isLoading: Boolean(authFlow?.active),
    error,
  };
};
