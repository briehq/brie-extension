import { ERROR, RECORD, RECORDING } from '@extension/shared';

import { pauseRecording, resumeRecording, startCaptureNow, stopRecording, toggleMic } from '@src/capture';

const ERROR_NOTIFICATION_COOLDOWN_MS = 60_000;
let lastErrorNotificationTimestamp = 0;

export const addWindowEventListeners = () => {
  // Injected scripts have no access to chrome.* APIs; they communicate back via window.postMessage.
  window.addEventListener('message', (event: MessageEvent) => {
    // SECURITY GAP: messages are not namespaced (no `event.data.source` check) and `type` is not
    // validated against an allowlist, so page scripts could spoof controller commands.
    if (event.source !== window || !event.data.type) return;

    const { type } = event.data;

    switch (type) {
      case RECORD.ADD: {
        const payload = event.data.payload;
        if (!payload) {
          console.warn('[RECORD:ADD] Missing payload');
          return;
        }

        chrome.runtime.sendMessage({ type: RECORD.ADD, data: payload }, () => {
          if (chrome.runtime.lastError) {
            console.error('[RECORD:ADD error]', chrome.runtime.lastError);
          }
        });

        if (payload.method === 'error' && payload.recordType === 'console') {
          const now = Date.now();
          if (now - lastErrorNotificationTimestamp >= ERROR_NOTIFICATION_COOLDOWN_MS) {
            lastErrorNotificationTimestamp = now;
            window.dispatchEvent(new CustomEvent(ERROR.DETECTED, { detail: payload }));
          }
        }

        break;
      }

      case RECORDING.PAUSE:
        pauseRecording();
        break;

      case RECORDING.RESUME:
        resumeRecording();
        break;

      case RECORDING.STOP:
        stopRecording();
        break;

      case RECORDING.TOGGLE_MIC:
        toggleMic();
        break;

      default:
        break;
    }
  });
};
