import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  RECORDING,
  REWIND,
  SCREENSHOT,
  getActiveTab,
  isRewindBlocked,
  sendMessageToActiveTab,
  sendMessageToTab,
  sendRuntimeMessageToActiveTab,
  useStorage,
} from '@extension/shared';
import type { CaptureMode, PopupState, RecordArea } from '@extension/shared';
import type {
  BaseStorage,
  CaptureState,
  RecordingSettings,
  RewindSettings,
  ScreenshotCaptureState,
} from '@extension/storage';
import {
  captureStateStorage,
  captureTabStorage,
  recordingSettingsStorage,
  rewindSettingsStorage,
} from '@extension/storage';

import { CaptureScreenshotView, CaptureSessionView, RecordVideoView } from './views';

export const CaptureContentView = ({ onActiveTabChange }: { onActiveTabChange: (id: number | null) => void }) => {
  const { state, mode } = useStorage<BaseStorage<CaptureState>>(captureStateStorage);
  const { rewind } = useStorage<BaseStorage<RewindSettings>>(rewindSettingsStorage);
  const { mic } = useStorage<BaseStorage<RecordingSettings>>(recordingSettingsStorage);

  const [popupState, setPopupState] = useState<PopupState>({
    captureMode: 'area',
    recordArea: 'tab',
    systemAudioEnabled: false,
    captureOpen: false,
    recordOpen: false,
  });

  const isVideoRecordingActive = useMemo(
    () => mode === 'video' && ['capturing', 'unsaved'].includes(state),
    [mode, state],
  );
  const isCaptureScreenshotActive = useMemo(
    () => mode === 'screenshot' && ['capturing', 'unsaved'].includes(state),
    [mode, state],
  );

  const updateCaptureState = useCallback(async (state: ScreenshotCaptureState) => {
    await captureStateStorage.setScreenshotState(state);
  }, []);

  const updateActiveTab = useCallback(async (tabId: number | null) => {
    await captureTabStorage.setCaptureTabId(tabId);
    onActiveTabChange(tabId);
  }, []);

  useEffect(() => {
    const handleEscapeKey = async (event: KeyboardEvent) => {
      if (event.key === 'Escape' && state === 'capturing') {
        await updateCaptureState('idle');
        await updateActiveTab(null);
      }
    };

    window.addEventListener('keydown', handleEscapeKey);

    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [state, updateActiveTab, updateCaptureState]);

  useEffect(() => {
    (async () => {
      try {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        const permission = status.state === 'granted' ? 'granted' : status.state === 'denied' ? 'denied' : 'unknown';
        const settings = await recordingSettingsStorage.getSettings();

        if (settings.mic.permission !== permission) {
          await recordingSettingsStorage.setMicPermission(permission);
        }
      } catch {
        // navigator.permissions.query may not be available (Firefox)
      }
    })();
  }, []);

  const handleOnCaptureScreenshot = useCallback(async () => {
    const tab = await getActiveTab();
    if (!tab?.id) return;

    await updateCaptureState('capturing');
    await updateActiveTab(tab.id);

    sendMessageToTab(tab.id, { action: SCREENSHOT.START, payload: { type: popupState.captureMode } });

    window.close();
  }, [popupState.captureMode, updateActiveTab, updateCaptureState]);

  const setCaptureMode = useCallback((next: CaptureMode) => {
    setPopupState(s => ({ ...s, captureMode: next }));
  }, []);

  const setRecordArea = useCallback((next: RecordArea) => {
    setPopupState(s => ({ ...s, recordArea: next }));
  }, []);

  const toggleCaptureOpen = useCallback(() => {
    setPopupState(s => ({ ...s, captureOpen: !s.captureOpen }));
  }, []);

  const onToggleRecordOpen = useCallback(() => {
    setPopupState(s => ({ ...s, recordOpen: !s.recordOpen }));
  }, []);

  const onToggleMic = useCallback(async () => {
    if (mic?.permission === 'granted') {
      await recordingSettingsStorage.setMicEnabled(!mic?.enabled);
    } else {
      chrome.tabs.create({
        url: chrome.runtime.getURL('mic-permission/index.html'),
        active: true,
      });
    }
  }, [mic?.enabled, mic?.permission]);

  const onShareRewind = async () => {
    try {
      const tab = await getActiveTab();

      if (!tab?.id || !tab?.url) {
        // TODO: show toast "No active tab"
        return;
      }

      const { id: tabId, url: tabUrl } = tab;

      if (tabUrl.startsWith('chrome://') || tabUrl.startsWith('edge://') || tabUrl.startsWith('about:')) return;

      const { blocked: rewindBlocked, reason } = isRewindBlocked(tabUrl);

      if (rewindBlocked) {
        // TODO: show toast "Rewind disabled on this site (reason: ...)"
        return;
      }

      const freeze = (await sendRuntimeMessageToActiveTab({ type: REWIND.FREEZE, tabId })) as { status: string };
      if (freeze?.status !== 'success') {
        // TODO: show toast with freezeResp.error
        return;
      }

      sendMessageToTab(tabId, { action: REWIND.OPEN_REVIEW, payload: { tabId } });
      window.close();
    } catch (err) {
      console.error('[brie|popup] onOpenRewind failed', err);
      // TODO: show toast "Failed to open rewind"
    }
  };

  const onRewindEnabled = useCallback(async (next: boolean) => {
    setPopupState(s => ({ ...s, rewindEnabled: next }));

    await rewindSettingsStorage.setRewindEnabled(next);

    await sendMessageToActiveTab(REWIND.SET_ENABLED, { enabled: next });
  }, []);

  const sendRecordingCommand = useCallback(
    (
      type: typeof RECORDING.START | typeof RECORDING.STOP | typeof RECORDING.PAUSE | typeof RECORDING.RESUME,
      captureType?: RecordArea,
    ) => {
      sendMessageToActiveTab(type, { captureType });
      window.close();
    },
    [],
  );

  const handleOnStartVideoRecording = useCallback(async () => {
    const tab = await getActiveTab();
    if (!tab?.id) return;

    await updateActiveTab(tab.id);

    await sendRecordingCommand(RECORDING.START, popupState.recordArea);
  }, [popupState.recordArea]);

  const handleOnStopVideoRecording = useCallback(async () => {
    await sendRecordingCommand(RECORDING.STOP);
  }, [sendRecordingCommand]);

  return (
    <div className="space-y-4">
      <CaptureScreenshotView
        isDisabled={isVideoRecordingActive}
        isActive={false}
        mode={popupState.captureMode}
        open={popupState.captureOpen}
        onToggleOpen={toggleCaptureOpen}
        onPrimaryAction={handleOnCaptureScreenshot}
        onChange={setCaptureMode}
      />

      <RecordVideoView
        isDisabled={isCaptureScreenshotActive}
        isActive={isVideoRecordingActive}
        open={popupState.recordOpen}
        onToggleOpen={onToggleRecordOpen}
        onPrimaryAction={() => {
          if (isVideoRecordingActive) {
            handleOnStopVideoRecording();
          } else {
            handleOnStartVideoRecording();
          }
        }}
        mode={popupState.recordArea}
        onChange={setRecordArea}
        isMicEnabled={!!mic?.enabled && mic?.permission === 'granted'}
        onToggleMic={isVideoRecordingActive ? undefined : onToggleMic}
      />

      <CaptureSessionView
        isDisabled={isCaptureScreenshotActive || isVideoRecordingActive}
        enabled={rewind.enabled}
        onToggle={onRewindEnabled}
        onOpen={onShareRewind}
      />
    </div>
  );
};
