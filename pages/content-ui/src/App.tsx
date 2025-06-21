import { useEffect, useState } from 'react';

import { useStorage } from '@extension/shared';
import { annotationsRedoStorage, annotationsStorage, captureStateStorage, themeStorage } from '@extension/storage';
import { store, ReduxProvider } from '@extension/store';
import { cn, ToasterProviderWrap, TooltipProvider } from '@extension/ui';

import Content from './content';

export default function App() {
  const theme = useStorage(themeStorage);
  const [screenshots, setScreenshots] = useState<{ name: string; image: string }[]>();

  useEffect(() => {
    const handleDisplayModal = async event => {
      setScreenshots(event.detail.screenshots); // Extract data from the event
      await captureStateStorage.setCaptureState('unsaved');
    };

    // Attach event listener
    window.addEventListener('DISPLAY_MODAL', handleDisplayModal);
    window.addEventListener('CLOSE_MODAL', handleOnCloseModal);

    // Cleanup event listener on unmount
    return () => {
      window.removeEventListener('DISPLAY_MODAL', handleDisplayModal);
      window.removeEventListener('CLOSE_MODAL', handleOnCloseModal);
    };
  }, []);

  const handleOnCloseModal = async () => {
    setScreenshots(null);

    await captureStateStorage.setCaptureState('idle');

    annotationsStorage.setAnnotations([]);
    annotationsRedoStorage.setAnnotations([]);
  };

  // if (!screenshots?.length) return null;

  return (
    <ReduxProvider store={store}>
      <TooltipProvider>
        <div className={cn(theme, 'relative')}>
          {screenshots?.length && (
            <main className="flex-1 md:container md:max-w-screen-xl">
              <div className="flex items-center justify-between gap-2 rounded bg-white">
                <Content onClose={handleOnCloseModal} screenshots={screenshots} />
              </div>
            </main>
          )}

          <ToasterProviderWrap richColors />
        </div>
      </TooltipProvider>
    </ReduxProvider>
  );
}
