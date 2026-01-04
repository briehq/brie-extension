import { useState, useMemo } from 'react';

import { useStorage } from '@extension/shared';
import { captureStateStorage } from '@extension/storage';
import { Tabs, TabsList, TabsTrigger, TabsContent, Icon } from '@extension/ui';

import { CaptureScreenshotGroup } from './components/capture';
import { CaptureVideoGroup } from './components/capture/video-group.capture';
import { SlicesHistoryButton, SlicesHistoryContent } from './components/slices-history';
import { Header, BetaNotifier } from './components/ui';

export const PopupContent = () => {
  const { state = 'idle', mode = 'screenshot' } = useStorage(captureStateStorage);
  const [showSlicesHistory, setShowSlicesHistory] = useState(false);

  const isVideoLocked = useMemo(() => mode === 'video' && state !== 'idle' && state !== 'error', [mode, state]);
  const isScreenshotLocked = useMemo(
    () => mode === 'screenshot' && (state === 'capturing' || state === 'unsaved'),
    [mode, state],
  );

  if (showSlicesHistory) {
    return <SlicesHistoryContent onBack={() => setShowSlicesHistory(false)} />;
  }

  return (
    <>
      <Header />
      {state} - {mode}
      <Tabs defaultValue={mode} className="mt-2">
        <TabsList className="w-full">
          <TabsTrigger
            value="screenshot"
            disabled={isVideoLocked}
            className="flex h-full w-full items-center gap-1.5 text-xs font-semibold">
            <Icon name="SquareDashed" className="size-3" strokeWidth={2} />
            <span>Screenshot</span>
          </TabsTrigger>

          <TabsTrigger
            value="video"
            disabled={isScreenshotLocked}
            className="flex h-full w-full items-center gap-1.5 text-xs font-semibold">
            <Icon name="Video" className="size-4" strokeWidth={1.5} />
            <span>Video</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="screenshot" className="mt-3">
          <CaptureScreenshotGroup />
        </TabsContent>

        <TabsContent value="video" className="mt-3">
          <CaptureVideoGroup />
        </TabsContent>
      </Tabs>
      {state === 'idle' && <SlicesHistoryButton onClick={() => setShowSlicesHistory(true)} />}
      <BetaNotifier />
    </>
  );
};
