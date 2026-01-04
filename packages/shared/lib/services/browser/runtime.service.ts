import { runtime } from 'webextension-polyfill';

import { getActiveTab } from './tabs.service.js';

export const sendRuntimeMessageToActiveTab = async (message: Record<string, unknown>) => {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  runtime.sendMessage({ ...message, tabId: tab.id });
};

export const getRuntimeURL = (path: string) => runtime.getURL(path);
