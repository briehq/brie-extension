import { useCallback, useEffect, useState } from 'react';
import browser from 'webextension-polyfill';

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
  const setAuthFlow = (state: AuthFlowState) => authIdentityProviderStorage.set(state);

  useEffect(() => {
    setAuthFlow(null);
  }, []);

  const register = useCallback(async () => {
    if (authFlow?.active) return;

    setError(null);
    setAuthFlow({ active: true });

    try {
      await browser.runtime.sendMessage({ type: 'AUTH_START' });
    } catch (e) {
      setError(e as Error);
      throw e;
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
