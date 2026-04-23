import type { Runtime } from 'webextension-polyfill';
import { tabs } from 'webextension-polyfill';

import { AUTH, CAPTURE, RECORD, REWIND, TAB } from '@extension/shared';
import { annotationsRedoStorage, annotationsStorage, captureStateStorage, captureTabStorage } from '@extension/storage';

import type { BgResponse, Record as BrieRecord } from '@src/types';
import { addOrMergeRecords, deleteRecords, getRecords, rewindService } from '@src/utils';

import { handleOnAuthStart } from './auth.service';

export const handleOnMessage = async (raw: unknown, sender: Runtime.MessageSender): Promise<BgResponse | void> => {
  const message = raw as Record<string, unknown>;

  try {
    switch (message.type) {
      case CAPTURE.EXIT: {
        await Promise.all([
          captureStateStorage.setScreenshotState('idle'),
          captureTabStorage.setCaptureTabId(null),
          annotationsStorage.clearAll(),
          annotationsRedoStorage.clearAll(),
        ]);

        return { status: 'success' };
      }

      case RECORD.ADD: {
        const tabId = sender.tab?.id;
        if (typeof tabId === 'number') addOrMergeRecords(tabId, message.data as BrieRecord);

        return { status: 'success' };
      }

      case RECORD.GET_ALL: {
        const tabId = sender.tab?.id;
        const records = tabId ? await getRecords(tabId) : [];

        return { records };
      }

      case RECORD.DELETE_ALL: {
        const tabId = sender.tab?.id;

        if (typeof tabId === 'number') await deleteRecords(tabId);

        return { status: 'success' };
      }

      case AUTH.START:
        return handleOnAuthStart();

      case TAB.GET_ACTIVE: {
        return { tab: sender.tab };
      }

      case REWIND.EVENT_BATCH: {
        const events = Array.isArray(message.events) ? (message.events as unknown[]) : [];

        await rewindService.ingestBatch(events, sender);
        return { status: 'success' };
      }

      case REWIND.FREEZE: {
        const tabId = message?.tabId;

        if (typeof tabId !== 'number') return { status: 'error', message: 'Invalid tabId' };

        const frozen = await rewindService.freeze(tabId);

        const durationMs = frozen.toTimestamp - frozen.fromTimestamp;
        const eventCount = frozen.events?.length ?? 0;

        addOrMergeRecords(tabId, {
          type: 'event',
          recordType: 'events',
          source: 'background',
          event: 'SessionReplayCaptured',
          timestamp: Date.now(),
          url: (await tabs.get(tabId).catch(() => null))?.url ?? '',
          description: `Session replay captured (${Math.round(durationMs / 1000)}s, ${eventCount} events)`,
          extra: {
            action: 'CAPTURED',
            durationMs,
            eventCount,
            fromTimestamp: frozen.fromTimestamp,
            toTimestamp: frozen.toTimestamp,
            missingAnchor: frozen.missingAnchor,
          },
        } as BrieRecord);

        return { status: 'success', ...frozen };
      }

      case REWIND.GET_FROZEN: {
        const tabId = sender.tab?.id;

        if (!tabId) return { status: 'error', message: 'Invalid tabId' };

        return (await rewindService.getFrozenOrFreeze(tabId)) as unknown as BgResponse;
      }

      case REWIND.RESET_TAB: {
        const tabId = message?.tabId;

        if (typeof tabId !== 'number') return { status: 'error', message: 'Invalid tabId' };

        await rewindService.resetTab(tabId);
        return { status: 'success' };
      }

      case REWIND.DELETE_TAB: {
        const tabId = sender.tab?.id;

        if (!tabId) return { status: 'error', message: 'Invalid tabId' };

        await rewindService.deleteTab(tabId);
        return { status: 'success' };
      }
    }

    if ('action' in message) {
      if (message.action === CAPTURE.CHECK_NATIVE) {
        const isAvailable = typeof tabs?.captureVisibleTab === 'function';

        return { isAvailable };
      }

      if (message.action === CAPTURE.VISIBLE_TAB) {
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
