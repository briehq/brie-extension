import { useCallback, useEffect, useMemo, useState } from 'react';

import { getActiveTab, sendMessageToActiveTab, sendMessageToTab, useStorage } from '@extension/shared';
import type { CaptureMode, PopupState, RecordArea } from '@extension/shared';
import type { BaseStorage, CaptureState, ScreenshotCaptureState } from '@extension/storage';
import { captureStateStorage, captureTabStorage } from '@extension/storage';

import { CaptureScreenshotView, CaptureSessionView, RecordVideoView } from './views';

export const CaptureContentView = ({ onActiveTabChange }: { onActiveTabChange: (id: number | null) => void }) => {
  const { state, mode } = useStorage<BaseStorage<CaptureState>>(captureStateStorage);

  const [popupState, setPopupState] = useState<PopupState>({
    captureMode: 'area',
    recordArea: 'tab',
    micEnabled: false,
    systemAudioEnabled: false,
    rewindEnabled: false,
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

  const handleOnCaptureScreenshot = useCallback(async () => {
    const tab = await getActiveTab();
    if (!tab?.id) return;

    await updateCaptureState('capturing');
    await updateActiveTab(tab.id);

    sendMessageToTab(tab.id, { action: 'START_SCREENSHOT', payload: { type: popupState.captureMode } });

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

  const onToggleMic = useCallback(() => {
    setPopupState(s => {
      return { ...s, micEnabled: !s.micEnabled };
    });
  }, []);

  const onRecord = useCallback(() => {}, []);
  const onOpenRewind = useCallback(() => {}, []);
  const setRewindEnabled = useCallback((next: boolean) => {
    setPopupState(s => ({ ...s, rewindEnabled: next }));
  }, []);

  const sendRecordingCommand = useCallback(
    (type: 'START_RECORDING' | 'STOP_RECORDING' | 'PAUSE_RECORDING' | 'RESUME_RECORDING', captureType?: RecordArea) => {
      sendMessageToActiveTab(type, { captureType });
      //   window.close();
    },
    [],
  );

  const handleOnStartVideoRecording = useCallback(async () => {
    const tab = await getActiveTab();
    if (!tab?.id) return;

    await updateActiveTab(tab.id);

    sendRecordingCommand('START_RECORDING', popupState.recordArea);
  }, [popupState.recordArea]);

  const handleOnStopVideoRecording = useCallback(() => {
    sendRecordingCommand('STOP_RECORDING');
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
        isMicEnabled={popupState.micEnabled}
        onToggleMic={onToggleMic}
      />

      {/* <CaptureSessionView enabled={popupState.rewindEnabled} onToggle={setRewindEnabled} onOpen={onOpenRewind} /> */}
    </div>
  );
};
