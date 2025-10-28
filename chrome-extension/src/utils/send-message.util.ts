import { tabs } from 'webextension-polyfill';

export const sendMessageToTab = async (tabId: number, payload: unknown): Promise<void> => {
  try {
    await tabs.sendMessage(tabId, payload);
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);

    console.warn('[background] sendMessageToTab failed:', msg);
  }
};

export const sendMessageToActiveTab = async (action: string, payload: unknown): Promise<void> => {
  const activeTabs = await tabs.query({ active: true, currentWindow: true });
  const tabId = activeTabs[0]?.id;

  if (!tabId) return;

  await sendMessageToTab(tabId, { action, payload });
};
