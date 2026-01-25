import type { Runtime } from 'webextension-polyfill';
import { tabs } from 'webextension-polyfill';

import { annotationsRedoStorage, annotationsStorage, captureStateStorage, captureTabStorage } from '@extension/storage';

import type { BgResponse } from '@src/types';
import { addOrMergeRecords, deleteRecords, getRecords, rewindService } from '@src/utils';

import { handleOnAuthStart } from './auth.service';

export const handleOnMessage = async (raw: unknown, sender: Runtime.MessageSender): Promise<BgResponse | void> => {
  const message = raw as Record<string, unknown>;

  try {
    switch (message.type) {
      case 'EXIT_CAPTURE': {
        await Promise.all([
          captureStateStorage.setScreenshotState('idle'),
          captureTabStorage.setCaptureTabId(null),
          annotationsStorage.clearAll(),
          annotationsRedoStorage.clearAll(),
        ]);

        return { status: 'success' };
      }

      case 'ADD_RECORD': {
        const tabId = sender.tab?.id;
        if (typeof tabId === 'number') addOrMergeRecords(tabId, message.data);

        return { status: 'success' };
      }

      case 'GET_RECORDS': {
        const tabId = sender.tab?.id;
        const records = tabId ? await getRecords(tabId) : [];

        return { records };
      }

      case 'DELETE_RECORDS': {
        const tabId = sender.tab?.id;

        if (typeof tabId === 'number') await deleteRecords(tabId);

        return { status: 'success' };
      }

      case 'AUTH_START':
        return handleOnAuthStart();

      case 'GET_ACTIVE_TAB': {
        return { tab: sender.tab };
      }

      case 'REWIND/EVENT_BATCH': {
        const events = Array.isArray(message.events) ? (message.events as unknown[]) : [];

        await rewindService.ingestBatch(events, sender);
        return { status: 'success' };
      }

      case 'REWIND/FREEZE': {
        const tabId = message?.tabId;

        if (!tabId) return { status: 'error', message: 'Invalid tabId' };

        const frozen = await rewindService.freeze(tabId);

        return { status: 'success', ...frozen };
      }

      case 'REWIND/GET_FROZEN': {
        const tabId = sender.tab?.id;

        if (!tabId) return { status: 'error', message: 'Invalid tabId' };

        return rewindService.getFrozenOrFreeze(tabId);
      }

      case 'REWIND/RESET_TAB': {
        const tabId = message?.tabId;

        if (!tabId) return { status: 'error', message: 'Invalid tabId' };

        await rewindService.resetTab(tabId);
        return { status: 'success' };
      }

      case 'REWIND/DELETE_TAB': {
        const tabId = sender.tab?.id;

        if (!tabId) return { status: 'error', message: 'Invalid tabId' };

        await rewindService.deleteTab(tabId);
        return { status: 'success' };
      }
    }

    if ('action' in message) {
      if (message.action === 'checkNativeCapture') {
        const isAvailable = typeof tabs?.captureVisibleTab === 'function';

        return { isAvailable };
      }

      if (message.action === 'captureVisibleTab') {
        try {
          const dataUrl = await tabs.captureVisibleTab(undefined, {
            format: 'jpeg',
            quality: 100,
          });

          return { success: true, dataUrl };
        } catch (e) {
          const msg = (e as Error)?.message ?? String(e);
          return { success: false, message: msg };
        }
      }
    }
  } catch (e) {
    console.error('[background] onMessage error:', e);
  }
};
