import type { Tabs } from 'webextension-polyfill';
import { runtime } from 'webextension-polyfill';

import { TAB } from '@extension/shared';

/**
 * Requests the active tab details.
 *
 * @returns Promise<Tabs> - The tab details.
 */
export const requestActiveTab = async (): Promise<Tabs.Tab> => {
  try {
    const response: { tab: Tabs.Tab } = await runtime.sendMessage({ type: TAB.GET_ACTIVE });

    return response?.tab ?? {};
  } catch (err: any) {
    console.error('[getActiveTab] Failed:', err?.message || err);
    throw err;
  }
};
