import { useState, useMemo, useEffect, useCallback } from 'react';

import { IS_DEV } from '@extension/env';
import { t } from '@extension/i18n';
import { AuthMethod, getActiveTab, reloadTab, sendMessageToTab, updateTab, useStorage } from '@extension/shared';
import type { BaseStorage, CaptureState, ScreenshotCaptureState } from '@extension/storage';
import { captureStateStorage, captureTabStorage, pendingReloadTabsStorage } from '@extension/storage';
import { useUser } from '@extension/store';
import { Button } from '@extension/ui';

import { CaptureContentView } from './components/capture';
import { InternalPageView, PendingReloadView, UnsavedCurrentTabView, UnsavedTabView } from './components/capture/views';
import { useSlicesCreatedToday } from './hooks';
import { isInternalUrl } from './utils';

interface ActiveTab {
  id: number | null;
  url: string;
}

export const PopupContent = () => {
  const totalSlicesCreatedToday = useSlicesCreatedToday();
  const user = useUser();

  const { state, mode } = useStorage<BaseStorage<CaptureState>>(captureStateStorage);
  const captureTabId = useStorage<BaseStorage<number | null>>(captureTabStorage);
  const pendingReloadTabIds = useStorage<BaseStorage<number[]>>(pendingReloadTabsStorage) ?? [];

  // const [showSlicesHistory, setShowSlicesHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>({ id: null, url: '' });
  const [currentActiveTab, setCurrentActiveTab] = useState<number | undefined>();

  const isCaptureActive = useMemo(() => ['capturing', 'unsaved'].includes(state), [state]);

  const isCaptureScreenshotDisabled = useMemo(() => {
    const isGuest = user?.fields?.authMethod === AuthMethod.GUEST;

    // Dev or non-guest: no limit
    if (IS_DEV || !isGuest) return false;

    // Guests: block after daily limit
    return isGuest && totalSlicesCreatedToday > 10 && !!activeTab.id;
  }, [totalSlicesCreatedToday, user?.fields?.authMethod, activeTab.id]);

  useEffect(() => {
    const initializeState = async () => {
      setActiveTab(prev => ({ ...prev, id: captureTabId ?? null }));

      const tab = await getActiveTab();
      if (tab) {
        setActiveTab(prev => ({ ...prev, url: tab.url ?? prev.url }));
        setCurrentActiveTab(tab.id);
      }
    };

    initializeState();
  }, [captureTabId]);

  const updateCaptureState = useCallback(async (state: ScreenshotCaptureState) => {
    console.log('POPUP: set screenshot state', state);
    await captureStateStorage.setScreenshotState(state);
  }, []);

  const updateActiveTab = useCallback(async (tabId: number | null) => {
    await captureTabStorage.setCaptureTabId(tabId);
    setActiveTab(prev => ({ ...prev, id: tabId }));
  }, []);

  const handleGoToActiveTab = useCallback(async () => {
    if (!activeTab.id) return;

    await updateTab(activeTab.id, { active: true });

    window.close();
  }, [activeTab.id]);

  const handleOnRefreshPendingTab = useCallback(async () => {
    if (!currentActiveTab) return;
    await reloadTab(currentActiveTab);
    await pendingReloadTabsStorage.remove(currentActiveTab);
  }, [currentActiveTab]);

  const handleOnDiscard = useCallback(
    async (activeTabId: number | null) => {
      await updateCaptureState('idle');
      await updateActiveTab(null);

      if (activeTabId) sendMessageToTab(activeTabId, { action: 'CLOSE_MODAL' });
    },
    [updateActiveTab, updateCaptureState],
  );

  const internalPage = isInternalUrl(activeTab.url);

  // if (showSlicesHistory) {
  //   return <SlicesHistoryContent onBack={() => setShowSlicesHistory(false)} />;
  // }

  // Use-case: Pending reload for this tab
  if (currentActiveTab && pendingReloadTabIds.includes(currentActiveTab)) {
    return <PendingReloadView onRefresh={handleOnRefreshPendingTab} />;
  }

  // Use-case: Internal page hint (no capture on chrome://, about://)
  if (internalPage && state !== 'unsaved' && currentActiveTab !== activeTab.id) {
    return <InternalPageView message={t('navigateToWebsite')} />;
  }

  // Use-case: Unsaved capture in another tab
  if (state === 'unsaved' && currentActiveTab !== activeTab.id) {
    return <UnsavedTabView onDiscard={() => handleOnDiscard(activeTab.id)} onOpenActiveTab={handleGoToActiveTab} />;
  }

  // Use-case: Unsaved capture in this tab
  if (state === 'unsaved' && currentActiveTab === activeTab.id) {
    return <UnsavedCurrentTabView onDiscard={() => handleOnDiscard(activeTab.id)} />;
  }

  // Use-case: Jump to active tab
  if (activeTab.id !== currentActiveTab && isCaptureActive)
    return (
      <Button type="button" variant="link" size="sm" className="w-full" onClick={handleGoToActiveTab}>
        {t('openActiveTab')}
      </Button>
    );

  return (
    <>
      <CaptureContentView
        onActiveTabChange={id => {
          setActiveTab(prev => ({ ...prev, id }));
        }}
      />
      {/* {state === 'idle' && <SlicesHistoryButton onClick={() => setShowSlicesHistory(true)} />} */}
    </>
  );
};
