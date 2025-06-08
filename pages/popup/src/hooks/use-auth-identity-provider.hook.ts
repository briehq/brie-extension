import { useCallback, useEffect, useState } from 'react';
import browser from 'webextension-polyfill';

import { APP_BASE_URL } from '@extension/env';
import { useStorage } from '@extension/shared';
import { authIdentityProviderStorage } from '@extension/storage';
import type { AuthIdentityProviderStorage as AuthFlowState } from '@extension/storage';

import { getRedirectURL } from '@src/utils';
import { persistTokens, waitForUri } from '@src/utils/auth';

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
    if (authFlow?.active && authFlow.tabId) {
      try {
        await browser.tabs.update(authFlow.tabId, { active: true });
        return;
      } catch (e) {
        setError(e as Error);
        setAuthFlow(null);
      }
    }

    setAuthFlow({ active: true });

    try {
      const redirectUri = getRedirectURL();
      const url = `${APP_BASE_URL}/register?redirect_uri=${encodeURIComponent(redirectUri)}`;

      let finalUrl: string;

      if (browser.identity?.launchWebAuthFlow) {
        finalUrl = await browser.identity.launchWebAuthFlow({ url, interactive: true });
        console.log('finalUrl', finalUrl);
      } else {
        const tab = await browser.tabs.create({ url, active: true });
        setAuthFlow({ active: true, tabId: tab.id });

        finalUrl = await waitForUri();
      }

      await persistTokens(finalUrl);
    } catch (e) {
      setError(e as Error);
      setAuthFlow(null);
      throw e;
    } finally {
      setAuthFlow(null);
    }
  }, [authFlow]);

  return {
    register,
    isLoading: Boolean(authFlow?.active),
    error,
  };
};
