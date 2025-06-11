import React, { useEffect, useState } from 'react';

import { useStorage } from '@extension/shared';
import { authTokensStorage, captureStateStorage, userUUIDStorage } from '@extension/storage';
import { useLoginGuestMutation } from '@extension/store';

import { CaptureScreenshotGroup } from './components/capture';
import { SlicesHistoryButton, SlicesHistoryContent } from './components/slices-history';
import { Header, BetaNotifier, Skeleton } from './components/ui';
import OnBoardingScreen from './components/ui/onboarding';

export const PopupContent = () => {
  const captureState = useStorage(captureStateStorage);
  const tokens = useStorage(authTokensStorage);
  const uuid = useStorage(userUUIDStorage);

  const [showSlicesHistory, setShowSlicesHistory] = useState(false);
  const [userMode, setUserMode] = useState<'account' | 'guest' | null>(null);
  const [loginGuest, { isLoading }] = useLoginGuestMutation();

  useEffect(() => {
    const initialGuestLogin = async () => {
      if (!tokens?.accessToken && uuid) {
        loginGuest({ uuid });
      }
    };

    initialGuestLogin();
  }, [loginGuest, tokens?.accessToken, uuid]);

  const handleOnBack = () => setShowSlicesHistory(false);

  useEffect(() => {
    chrome.storage.local.get(['userMode'], ({ userMode }) => {
      setUserMode(userMode);
    });
  }, []);

  useEffect(() => {
    const handleStorageChange = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === 'local' && changes.userMode) {
        const newMode = changes.userMode.newValue as 'guest' | 'account' | null;

        if (newMode === 'guest') {
          setUserMode('guest');
        } else if (newMode === 'account') {
          setUserMode('account');
        } else {
          setUserMode(null);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  if (isLoading) {
    return <Skeleton />;
  }

  return showSlicesHistory ? (
    <SlicesHistoryContent onBack={handleOnBack} />
  ) : (
    <>
      {!userMode ? (
        <OnBoardingScreen />
      ) : (
        <React.Fragment>
          <Header />
          <CaptureScreenshotGroup />
          {captureState === 'idle' && <SlicesHistoryButton onClick={() => setShowSlicesHistory(true)} />}
          <BetaNotifier />
        </React.Fragment>
      )}
    </>
  );
};
