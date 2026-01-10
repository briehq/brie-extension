import type { Tabs } from 'webextension-polyfill';

import {
  annotationsHistoryStorage,
  annotationsRedoStorage,
  annotationsStorage,
  captureStateStorage,
  captureTabStorage,
  pendingReloadTabsStorage,
} from '@extension/storage';

import { deleteRecords } from '@src/utils';

export const handleOnTabRemoved = async (tabId: number) => {
  try {
    const pendingTabIds = await pendingReloadTabsStorage.getAll();
    if (pendingTabIds.includes(tabId)) {
      await pendingReloadTabsStorage.remove(tabId);
    }

    await deleteRecords(tabId);

    const captureTabId = await captureTabStorage.getCaptureTabId();
    if (tabId === captureTabId) {
      await Promise.all([
        captureStateStorage.setScreenshotState('idle'),
        captureTabStorage.setCaptureTabId(null),
        annotationsStorage.clearAll(),
        annotationsRedoStorage.clearAll(),
      ]);
    }
  } catch (e) {
    console.error('[background] onTabRemoved error:', e);
  }
};

export const handleOnTabUpdated = async (tabId: number, changeInfo: Tabs.OnUpdatedChangeInfoType, tab: Tabs.Tab) => {
  try {
    if (changeInfo.status === 'complete') {
      const pendingTabIds = await pendingReloadTabsStorage.getAll();

      if (pendingTabIds.includes(tabId)) {
        await pendingReloadTabsStorage.remove(tabId);
      }
    }

    if (changeInfo.status !== 'loading') return;

    const [state, capturedTabId] = await Promise.all([
      captureStateStorage.getState(),
      captureTabStorage.getCaptureTabId(),
    ]);

    if (!capturedTabId && state === 'unsaved') {
      await captureStateStorage.setScreenshotState('idle');
    }

    if (tabId === capturedTabId && state !== 'capturing') {
      await Promise.all([
        captureStateStorage.setScreenshotState('idle'),
        captureTabStorage.setCaptureTabId(null),
        annotationsStorage.clearAll(),
        annotationsRedoStorage.clearAll(),
        annotationsHistoryStorage.clearAll(),
      ]);
    }
  } catch (err) {
    console.error('[background] onTabUpdated error:', err);
  }
};
