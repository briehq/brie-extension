import type { Tabs } from 'webextension-polyfill';
import { tabs } from 'webextension-polyfill';

export const getActiveTab = async (): Promise<Tabs.Tab | undefined> => {
  const [tab] = await tabs.query({ active: true, currentWindow: true });
  return tab;
};

export const reloadTab = (tabId: number, reloadProps: Tabs.ReloadReloadPropertiesType = {}) => {
  return tabs.reload(tabId, reloadProps);
};

export const updateTab = (tabId: number, updateProps: Tabs.UpdateUpdatePropertiesType) => {
  return tabs.update(tabId, updateProps);
};

export const sendMessageToTab = async (tabId: number, payload: unknown): Promise<void> => {
  try {
    await tabs.sendMessage(tabId, payload);
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);

    console.warn('[background] sendMessageToTab failed:', msg);
  }
};

export const sendMessageToActiveTab = async (action: string, payload: unknown): Promise<void> => {
  const tab = await getActiveTab();
  const tabId = tab?.id;

  if (!tabId) return;

  await sendMessageToTab(tabId, { action, payload });
};
