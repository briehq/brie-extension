import { useCallback, useEffect, useMemo, useState } from 'react';

import { IS_DEV } from '@extension/env';
import { t } from '@extension/i18n';
import { AuthMethod, getActiveTab, sendMessageToTab, updateTab, reloadTab, useStorage } from '@extension/shared';
import type { BaseStorage } from '@extension/storage';
import { captureStateStorage, captureTabStorage, pendingReloadTabsStorage } from '@extension/storage';
import { useUser } from '@extension/store';
import { Button } from '@extension/ui';

import { useSlicesCreatedToday } from '@src/hooks';
import { isInternalUrl } from '@src/utils';

import {
  CaptureOptionsView,
  InternalPageView,
  PendingReloadView,
  UnsavedCurrentTabView,
  UnsavedTabView,
} from './views';

type CaptureType = 'area' | 'viewport' | 'full-page';
type CaptureMode = 'single' | 'multiple';
type CaptureState = 'idle' | 'capturing' | 'unsaved';

interface ActiveTab {
  id: number | null;
  url: string;
}

const DEFAULT_MODE: CaptureMode = 'multiple';

export const CaptureScreenshotGroup: React.FC = () => {
  const totalSlicesCreatedToday = useSlicesCreatedToday();
  const user = useUser();

  const captureState = useStorage<BaseStorage<CaptureState>>(captureStateStorage);
  const captureTabId = useStorage<BaseStorage<number | null>>(captureTabStorage);
  const pendingReloadTabIds = useStorage<BaseStorage<number[]>>(pendingReloadTabsStorage) ?? [];

  const [activeTab, setActiveTab] = useState<ActiveTab>({ id: null, url: '' });
  const [currentActiveTab, setCurrentActiveTab] = useState<number | undefined>();
  const [mode] = useState<CaptureMode>(DEFAULT_MODE);

  const isCaptureActive = useMemo(
    () => ['capturing', 'unsaved'].includes(captureState as CaptureState),
    [captureState],
  );

  const isCaptureScreenshotDisabled = useMemo(() => {
    const isGuest = user?.fields?.authMethod === AuthMethod.GUEST;

    // Dev / non-guest: no limit
    if (IS_DEV || !isGuest) return false;

    // Guests: block after daily limit, but only if we know the active tab
    return isGuest && totalSlicesCreatedToday > 10 && !!activeTab.id;
  }, [totalSlicesCreatedToday, user?.fields?.authMethod, activeTab.id]);

  const updateCaptureState = useCallback(async (state: CaptureState) => {
    await captureStateStorage.setCaptureState(state);
  }, []);

  const updateActiveTab = useCallback(async (tabId: number | null) => {
    await captureTabStorage.setCaptureTabId(tabId);
    setActiveTab(prev => ({ ...prev, id: tabId }));
  }, []);

  useEffect(() => {
    const initializeState = async () => {
      // Sync capture tab ID
      setActiveTab(prev => ({ ...prev, id: captureTabId ?? null }));

      const tab = await getActiveTab();
      if (tab) {
        setActiveTab(prev => ({ ...prev, url: tab.url ?? prev.url }));
        setCurrentActiveTab(tab.id);
      }
    };

    const handleEscapeKey = async (event: KeyboardEvent) => {
      if (event.key === 'Escape' && captureState === 'capturing') {
        await updateCaptureState('idle');
        await updateActiveTab(null);
      }
    };

    initializeState();

    window.addEventListener('keydown', handleEscapeKey);

    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [captureState, captureTabId, updateActiveTab, updateCaptureState]);

  const handleCaptureScreenshot = useCallback(
    async (type: CaptureType) => {
      const tab = await getActiveTab();
      if (!tab?.id) return;

      await updateCaptureState('capturing');
      await updateActiveTab(tab.id);

      sendMessageToTab(tab.id, { action: 'START_SCREENSHOT', payload: { type } });

      window.close();
    },
    [updateActiveTab, updateCaptureState],
  );

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
      if (!activeTabId) return;

      await updateCaptureState('idle');
      await updateActiveTab(null);

      sendMessageToTab(activeTabId, { action: 'CLOSE_MODAL' });
    },
    [updateActiveTab, updateCaptureState],
  );

  const internalPage = isInternalUrl(activeTab.url);
  const showExitCapture =
    (isCaptureActive && mode === 'single') || (isCaptureActive && currentActiveTab !== activeTab.id);

  // Use-case: Pending reload for this tab
  if (currentActiveTab && pendingReloadTabIds.includes(currentActiveTab)) {
    return <PendingReloadView onRefresh={handleOnRefreshPendingTab} />;
  }

  // Use-case: Internal page hint (no capture on chrome://, about://)
  if (internalPage && captureState !== 'unsaved' && currentActiveTab !== activeTab.id) {
    return <InternalPageView message={t('navigateToWebsite')} />;
  }

  // Use-case: Unsaved capture in another tab
  if (captureState === 'unsaved' && currentActiveTab !== activeTab.id) {
    return <UnsavedTabView onDiscard={() => handleOnDiscard(activeTab.id)} onOpenActiveTab={handleGoToActiveTab} />;
  }

  // Use-case: Unsaved capture in this tab
  if (captureState === 'unsaved' && currentActiveTab === activeTab.id) {
    return <UnsavedCurrentTabView onDiscard={() => handleOnDiscard(activeTab.id)} />;
  }

  // Use-case: Capture screenshots group  options
  return (
    <>
      <CaptureOptionsView
        disabled={isCaptureScreenshotDisabled}
        showExitCapture={showExitCapture}
        onExitCapture={() => handleOnDiscard(activeTab.id)}
        onCapture={handleCaptureScreenshot}
      />

      {activeTab.id !== currentActiveTab && isCaptureActive && (
        <Button type="button" variant="link" size="sm" className="w-full" onClick={handleGoToActiveTab}>
          {t('openActiveTab')}
        </Button>
      )}
    </>
  );
};
