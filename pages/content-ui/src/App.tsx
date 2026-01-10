import { useCallback, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';

import { t } from '@extension/i18n';
import type { Screenshot } from '@extension/shared';
import { useStorage } from '@extension/shared';
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

export default function App() {
  const captureNotifyState = useStorage(captureNotifyStorage);
  const { state: captureState, mode } = useStorage(captureStateStorage);
  const theme = useStorage(themeStorage);
  const [minimized, setMinimized] = useState(true);
  const [video, setVideo] = useState<VideoSource>();
  const [screenshots, setScreenshots] = useState<Screenshot[]>();
  const [activeScreenshotId, setActiveScreenshotId] = useState<string | null>();
  const [idempotencyKey, setIdempotencyKey] = useState<string>(uuid());

  useEffect(() => {
    window.addEventListener('DISPLAY_MODAL', handleOnDisplay);
    window.addEventListener('CLOSE_MODAL', handleOnClose);
    window.addEventListener('STORE_SCREENSHOT', handleOnStoreScreenshot);
    window.addEventListener('AUTH_STATUS', handleOnAuthStatus);
    window.addEventListener('VIDEO_CAPTURED', handleOnVideoCaptured);

    return () => {
      window.removeEventListener('DISPLAY_MODAL', handleOnDisplay);
      window.removeEventListener('CLOSE_MODAL', handleOnClose);
      window.removeEventListener('STORE_SCREENSHOT', handleOnStoreScreenshot);
      window.removeEventListener('AUTH_STATUS', handleOnAuthStatus);
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

  const handleOnClose = useCallback(async () => {
    setIdempotencyKey(uuid());
    setScreenshots([]);
    setVideo({} as any);
    setMinimized(false);

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
  const isDialogOpen = !!screenshots?.length || !!video?.blob;

  return (
    <div id="brie-content" className={cn('light', 'relative')}>
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
