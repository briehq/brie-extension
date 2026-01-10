import { runtime } from 'webextension-polyfill';

/**
 * Requests the active tab details.
 *
 * @returns Promise<Tabs> - The tab details.
 */
export const requestActiveTab = async (): Promise<any> => {
  try {
    const response: { tab: any } = await runtime.sendMessage({ type: 'GET_ACTIVE_TAB' });

    return response?.tab ?? {};
  } catch (err: any) {
    console.error('[getActiveTab] Failed:', err?.message || err);
    throw err;
  }
};
