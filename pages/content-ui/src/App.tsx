import type { eventWithTime } from '@rrweb/types';
import { useCallback, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';

import { t } from '@extension/i18n';
import type { Screenshot } from '@extension/shared';
import { sendRuntimeMessageToActiveTab, useStorage } from '@extension/shared';
import {
  annotationsHistoryStorage,
  annotationsRedoStorage,
  annotationsStorage,
  captureNotifyStorage,
  captureStateStorage,
  themeStorage,
} from '@extension/storage';
import { store, ReduxProvider } from '@extension/store';
import { cn, toast, ToasterProvider, TooltipProvider } from '@extension/ui';

import { MinimizedPreview } from './components/dialog-view';
import { RecordingOverlay } from './components/recording-view';
import Content from './content';
import type { VideoSource } from './models';
import { requestActiveTab } from './utils/recording';

export default function App() {
  const captureNotifyState = useStorage(captureNotifyStorage);
  const { state: captureState, mode } = useStorage(captureStateStorage);
  const theme = useStorage(themeStorage);
  const [minimized, setMinimized] = useState(true);
  const [video, setVideo] = useState<VideoSource>();
  const [screenshots, setScreenshots] = useState<Screenshot[]>();
  const [activeScreenshotId, setActiveScreenshotId] = useState<string | null>();
  const [idempotencyKey, setIdempotencyKey] = useState<string>(uuid());
  const [events, setEvents] = useState<unknown[] | null>(null);

  useEffect(() => {
    window.addEventListener('DISPLAY_MODAL', handleOnDisplay);
    window.addEventListener('CLOSE_MODAL', handleOnClose);
    window.addEventListener('STORE_SCREENSHOT', handleOnStoreScreenshot);
    window.addEventListener('AUTH_STATUS', handleOnAuthStatus);
    window.addEventListener('VIDEO_CAPTURED', handleOnVideoCaptured);
    window.addEventListener('REWIND/OPEN_REVIEW', handleOnRewindCapture);

    return () => {
      window.removeEventListener('DISPLAY_MODAL', handleOnDisplay);
      window.removeEventListener('CLOSE_MODAL', handleOnClose);
      window.removeEventListener('STORE_SCREENSHOT', handleOnStoreScreenshot);
      window.removeEventListener('AUTH_STATUS', handleOnAuthStatus);
      window.removeEventListener('REWIND/OPEN_REVIEW', handleOnRewindCapture);
    };
  }, []);

  const handleOnVideoCaptured = async (event: any) => {
    setVideo(event.detail);
    setMinimized(false);
  };

  const handleOnAuthStatus = async (event: any) => {
    if (event.detail.ok) toast.success(t('authCompleted'));
    else toast.error(t('authFailed'));
  };

  const handleOnStoreScreenshot = (event: any) => {
    handleOnMinimize();
    setScreenshots(screenshots => [...(screenshots ?? []), ...event.detail.screenshots]);

    if (!captureNotifyState?.notified) {
      setTimeout(async () => {
        toast.message(t('screenshotCaptured'), {
          duration: 5000,
          closeButton: true,
          description: t('screenshotCapturedDescription'),
        });

        await captureNotifyStorage.set({ notified: true });
      }, 1000);
    }
  };

  const handleOnDisplay = async (event: any) => {
    setScreenshots(event.detail.screenshots);
    setMinimized(false);
    await captureStateStorage.setScreenshotState('unsaved');
  };

  const handleOnRewindCapture = useCallback(async () => {
    try {
      const tab = await requestActiveTab();
      const tabId = tab?.id;

      if (!tabId) {
        toast.error('No active tab for rewind');
        return;
      }

      const rewindResponse: {
        events: eventWithTime[];
        fromTimestamp: number;
        missingAnchor: boolean;
        toTimestamp: number;
      } = await sendRuntimeMessageToActiveTab({
        type: 'REWIND/GET_FROZEN',
        tabId,
      });

      if (rewindResponse?.missingAnchor) {
        toast.message('No user actions captured yet');
        return;
      }

      setEvents(rewindResponse?.events || []);
      setMinimized(false);
    } catch (error) {
      console.error('[brie|rewind] failed to load frozen snapshot', error);
      toast.error('Failed to load rewind replay');
    }
  }, []);

  const handleOnClose = useCallback(async () => {
    setIdempotencyKey(uuid());
    setScreenshots([]);
    setVideo({} as any);
    setEvents([]);
    setMinimized(false);

    const tab = await requestActiveTab();

    if (tab?.id) {
      await sendRuntimeMessageToActiveTab({ type: 'REWIND/RESET_TAB', tabId: tab.id });
    }

    await Promise.all([
      captureStateStorage.setScreenshotState('idle'),
      annotationsStorage.clearAll(),
      annotationsRedoStorage.clearAll(),
      annotationsHistoryStorage.clearAll(),
    ]);
  }, []);

  const handleOnSelectScreenshot = useCallback(
    (id: string) => {
      if (id !== activeScreenshotId) setActiveScreenshotId(id);
    },
    [activeScreenshotId],
  );

  const handleOnDeleteScreenshot = useCallback(
    async (id: string) => {
      setScreenshots(prev => {
        const next = prev?.filter(s => s.id !== id);

        if (activeScreenshotId === id) setActiveScreenshotId(next?.[0]?.id ?? null);

        return next;
      });

      await Promise.all([
        annotationsStorage.deleteAnnotations(id),
        annotationsRedoStorage.deleteAnnotations(id),
        annotationsHistoryStorage.deleteAnnotations(id),
      ]);
    },
    [activeScreenshotId],
  );

  const handleOnMinimize = async () => {
    await captureStateStorage.setScreenshotState('capturing');
    setMinimized(true);
  };

  const handleOnEdit = async () => {
    setActiveScreenshotId(screenshots?.[0]?.id);

    setMinimized(false);

    await captureStateStorage.setScreenshotState('unsaved');
  };

  const capturing = captureState === 'capturing' && mode === 'screenshot';
  const isDialogOpen = !!screenshots?.length || !!video?.blob || !!events?.length;

  return (
    <div id="brie-content" className={cn(theme, 'relative')}>
      <TooltipProvider>
        <RecordingOverlay />

        <ToasterProvider theme={theme} />

        <ReduxProvider store={store}>
          {isDialogOpen &&
            (minimized ? (
              <MinimizedPreview
                screenshots={screenshots || []}
                onEdit={handleOnEdit}
                unsaved={capturing}
                onDiscard={handleOnClose}
              />
            ) : (
              <Content
                idempotencyKey={idempotencyKey}
                activeScreenshotId={activeScreenshotId || ''}
                screenshots={screenshots || []}
                video={video}
                events={events}
                onClose={handleOnClose}
                onMinimize={handleOnMinimize}
                onDeleteScreenshot={handleOnDeleteScreenshot}
                onSelectScreenshot={handleOnSelectScreenshot}
              />
            ))}
        </ReduxProvider>
      </TooltipProvider>
    </div>
  );
}
