import { useState } from 'react';

import { useStorage } from '@extension/shared';
import { captureStateStorage } from '@extension/storage';

import { CaptureScreenshotGroup } from './components/capture';
import { SlicesHistoryButton, SlicesHistoryContent } from './components/slices-history';
import { Header, BetaNotifier } from './components/ui';

export const PopupContent = () => {
  const [showSlicesHistory, setShowSlicesHistory] = useState(false);

  const captureState = useStorage(captureStateStorage);

  const handleOnBack = () => setShowSlicesHistory(false);

  if (showSlicesHistory) {
    return <SlicesHistoryContent onBack={handleOnBack} />;
  }

  return (
    <>
      ss s
      <Header />
      <CaptureScreenshotGroup />
      {captureState === 'idle' && <SlicesHistoryButton onClick={() => setShowSlicesHistory(true)} />}
      <BetaNotifier />
    </>
  );
};
