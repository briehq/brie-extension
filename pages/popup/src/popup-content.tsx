import { useState } from 'react';

import { useStorage } from '@extension/shared';
import { captureStateStorage } from '@extension/storage';

import { CaptureScreenshotGroup } from './components/capture';
import { SettingsButton, SettingsContent } from './components/settings';
import { SlicesHistoryButton, SlicesHistoryContent } from './components/slices-history';
import { Header, BetaNotifier } from './components/ui';

export const PopupContent = () => {
  const [showSlicesHistory, setShowSlicesHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const captureState = useStorage(captureStateStorage);

  const handleOnBack = () => {
    setShowSlicesHistory(false);
    setShowSettings(false);
  };

  if (showSlicesHistory) {
    return <SlicesHistoryContent onBack={handleOnBack} />;
  }

  if (showSettings) {
    return <SettingsContent onBack={handleOnBack} />;
  }

  return (
    <>
      <Header />
      <CaptureScreenshotGroup />
      {captureState === 'idle' && <SlicesHistoryButton onClick={() => setShowSlicesHistory(true)} />}
      {captureState === 'idle' && <SettingsButton onClick={() => setShowSettings(true)} />}
      <BetaNotifier />
    </>
  );
};
