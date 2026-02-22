import { identity } from 'webextension-polyfill';

import { APP_BASE_URL } from '@extension/env';
import { AUTH, sendMessageToActiveTab } from '@extension/shared';
import { authIdentityProviderStorage } from '@extension/storage';

import type { BgResponse } from '@src/types';
import { persistTokens } from '@src/utils';

export const handleOnAuthStart = async (): Promise<BgResponse> => {
  try {
    const redirectUri = identity.getRedirectURL();
    const url = `${APP_BASE_URL}/auth?redirect_uri=${encodeURIComponent(redirectUri)}`;

    const responseUrl: string = await identity.launchWebAuthFlow({
      url,
      interactive: true,
    });

    if (!responseUrl) throw new Error('EMPTY_URL');

    await persistTokens(responseUrl);
    await sendMessageToActiveTab(AUTH.STATUS, { ok: true });

    return { ok: true };
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    const isUserCancel = /user cancelled|canceled/i.test(msg);

    await sendMessageToActiveTab(AUTH.STATUS, { ok: false, error: msg });

    return { ok: false, error: isUserCancel ? 'USER_CANCELLED' : msg };
  } finally {
    // The popup closes when launchWebAuthFlow opens the auth tab (loses focus),
    // so the popup's finally block never runs. The background must clear the
    // auth flow flag so the button isn't stuck in loading state on next open.
    await authIdentityProviderStorage.set(null);
  }
};
