import { useState, useMemo, useEffect, useCallback } from 'react';

import { IS_DEV } from '@extension/env';
import { t } from '@extension/i18n';
import { AuthMethod, UI, getActiveTab, reloadTab, sendMessageToTab, updateTab, useStorage } from '@extension/shared';
import type { BaseStorage, CaptureState, ScreenshotCaptureState } from '@extension/storage';
import { captureStateStorage, captureTabStorage, pendingReloadTabsStorage } from '@extension/storage';
import { Button } from '@extension/ui';

import { CaptureContentView } from './components/capture';
import { InternalPageView, PendingReloadView, UnsavedCurrentTabView, UnsavedTabView } from './components/capture/views';
import { SettingsButton, SettingsContent } from './components/settings';
import { SlicesHistoryButton, SlicesHistoryContent } from './components/slices-history';
import { Header, BetaNotifier } from './components/ui';
import { useSlicesCreatedToday } from './hooks';
import { useAuthStateContext } from './providers/auth-state.provider';
import { isInternalUrl } from './utils';

interface ActiveTab {
  id: number | null;
  url: string;
}

export const PopupContent = () => {
  const totalSlicesCreatedToday = useSlicesCreatedToday();
  const { user } = useAuthStateContext();

  const { state, mode } = useStorage<BaseStorage<CaptureState>>(captureStateStorage);
  const captureTabId = useStorage<BaseStorage<number | null>>(captureTabStorage);
  const pendingReloadTabIds = useStorage<BaseStorage<number[]>>(pendingReloadTabsStorage) ?? [];

  const [showSlicesHistory, setShowSlicesHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>({ id: null, url: '' });
  const [currentActiveTab, setCurrentActiveTab] = useState<number | undefined>();

  const handleOnBack = () => {
    setShowSlicesHistory(false);
    setShowSettings(false);
  };

  const isCaptureActive = useMemo(() => ['capturing', 'unsaved'].includes(state), [state]);

  const isCaptureScreenshotDisabled = useMemo(() => {
    const isGuest = user?.authMethod === AuthMethod.GUEST;

    // Dev or non-guest: no limit
    if (IS_DEV || !isGuest) return false;

    // Guests: block after daily limit
    return isGuest && totalSlicesCreatedToday > 10 && !!activeTab.id;
  }, [totalSlicesCreatedToday, user?.authMethod, activeTab.id]);

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

      if (activeTabId) sendMessageToTab(activeTabId, { action: UI.CLOSE_MODAL });
    },
    [updateActiveTab, updateCaptureState],
  );

  const internalPage = isInternalUrl(activeTab.url);

  if (showSlicesHistory) {
    return <SlicesHistoryContent onBack={handleOnBack} />;
  }

  if (showSettings) {
    return <SettingsContent onBack={handleOnBack} />;
  }

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
      {state === 'idle' && <SlicesHistoryButton onClick={() => setShowSlicesHistory(true)} />}
      {state === 'idle' && <SettingsButton onClick={() => setShowSettings(true)} />}
      <BetaNotifier />
    </>
  );
};
