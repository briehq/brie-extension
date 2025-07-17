import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Screenshot } from '@extension/shared';
import { useStorage } from '@extension/shared';
import {
  annotationHistoryStorage,
  annotationsRedoStorage,
  annotationsStorage,
  captureStateStorage,
  themeStorage,
} from '@extension/storage';
import { store, ReduxProvider } from '@extension/store';
import { cn, ToasterProvider, TooltipProvider } from '@extension/ui';

import { MinimizedPreview } from './components/dialog-view';
import Content from './content';

export default function App() {
  const captureState = useStorage(captureStateStorage);
  const theme = useStorage(themeStorage);
  const [minimized, setMinimized] = useState(true);
  const [screenshots, setScreenshots] = useState<Screenshot[]>();
  const [activeScreenshotId, setActiveScreenshotId] = useState<string | null>();

  useEffect(() => {
    window.addEventListener('DISPLAY_MODAL', handleOnDisplay);
    window.addEventListener('CLOSE_MODAL', handleOnClose);
    window.addEventListener('STORE_SCREENSHOT', handleOnStoreScreenshot);

    return () => {
      window.removeEventListener('DISPLAY_MODAL', handleOnDisplay);
      window.removeEventListener('CLOSE_MODAL', handleOnClose);
      window.removeEventListener('STORE_SCREENSHOT', handleOnStoreScreenshot);
    };
  }, []);

  const handleOnStoreScreenshot = async (event: any) => {
    handleOnMinimize();
    setScreenshots(screenshots => [...(screenshots?.length ? screenshots : []), ...event.detail.screenshots]);
  };

  const handleOnDisplay = async (event: any) => {
    setScreenshots(event.detail.screenshots);
    setMinimized(false);
    await captureStateStorage.setCaptureState('unsaved');
  };

  const handleOnClose = useCallback(async () => {
    setScreenshots([]);
    setMinimized(false);

    await Promise.all([
      captureStateStorage.setCaptureState('idle'),
      annotationsStorage.clearAll(),
      annotationsRedoStorage.clearAll(),
      annotationHistoryStorage.clearAll(),
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
        annotationHistoryStorage.deleteAnnotations(id),
      ]);
    },
    [activeScreenshotId],
  );

  const handleOnMinimize = () => setMinimized(true);
  const handleOnEdit = () => {
    setActiveScreenshotId(screenshots?.[0]?.id);

    setMinimized(false);
  };

  if (!screenshots?.length) return null;

  const unsaved = captureState === 'capturing';

  return (
    <div id="brie-content" className={cn('light', 'relative')}>
      <ReduxProvider store={store}>
        <TooltipProvider>
          {minimized ? (
            <MinimizedPreview
              screenshots={screenshots}
              onEdit={handleOnEdit}
              unsaved={unsaved}
              onDiscard={handleOnClose}
            />
          ) : (
            <Content
              activeScreenshotId={activeScreenshotId || ''}
              screenshots={screenshots}
              onClose={handleOnClose}
              onMinimize={handleOnMinimize}
              onDeleteScreenshot={handleOnDeleteScreenshot}
              onSelectScreenshot={handleOnSelectScreenshot}
            />
          )}

          <ToasterProvider theme={theme} />
        </TooltipProvider>
      </ReduxProvider>
    </div>
  );
}
