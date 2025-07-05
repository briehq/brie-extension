import { useCallback, useEffect, useState } from 'react';

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
  const [screenshots, setScreenshots] = useState<{ name: string; image: string }[]>();

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

    await captureStateStorage.setCaptureState('idle');
    await annotationsStorage.setAnnotations([]);
    await annotationsRedoStorage.setAnnotations([]);
    await annotationHistoryStorage.setHistory([]);
  }, []);

  const handleOnMinimize = () => setMinimized(true);
  const handleOnEdit = () => setMinimized(false);

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
            <Content screenshots={screenshots} onClose={handleOnClose} onMinimize={handleOnMinimize} />
          )}

          <ToasterProvider theme={theme} />
        </TooltipProvider>
      </ReduxProvider>
    </div>
  );
}
