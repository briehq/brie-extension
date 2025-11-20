import { identity } from 'webextension-polyfill';

import { APP_BASE_URL } from '@extension/env';

import type { BgResponse } from '@src/types';
import { persistTokens, sendMessageToActiveTab } from '@src/utils';

export const handleOnAuthStart = async (): Promise<BgResponse> => {
  try {
    const redirectUri = identity.getRedirectURL();
    const url = `${APP_BASE_URL}/register?redirect_uri=${encodeURIComponent(redirectUri)}`;

    const responseUrl: string = await identity.launchWebAuthFlow({
      url,
      interactive: true,
    });

    if (!responseUrl) throw new Error('EMPTY_URL');

    await persistTokens(responseUrl);
    await sendMessageToActiveTab('AUTH_STATUS', { ok: true });

    return { ok: true };
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    const isUserCancel = /user cancelled|canceled/i.test(msg);

    await sendMessageToActiveTab('AUTH_STATUS', { ok: false, error: msg });

    return { ok: false, error: isUserCancel ? 'USER_CANCELLED' : msg };
  }
};
