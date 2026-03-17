import { runtime } from 'webextension-polyfill';

import { getActiveTab } from './tabs.service.js';

export const sendRuntimeMessageToActiveTab = async (payload: Record<string, unknown>) => {
  const { tabId: providedTabId, ...rest } = payload;

  let resolvedTabId = providedTabId;

  if (!resolvedTabId) {
    const tab = await getActiveTab();
    resolvedTabId = tab?.id;

    if (!tab?.id) return;
  }

  return runtime.sendMessage({ ...rest, tabId: resolvedTabId });
};

export const getRuntimeURL = (path: string) => runtime.getURL(path);
