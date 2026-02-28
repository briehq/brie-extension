import { ERROR, RECORD, RECORDING } from '@extension/shared';

import { pauseRecording, resumeRecording, startCaptureNow, stopRecording, toggleMic } from '@src/capture';

const ERROR_NOTIFICATION_COOLDOWN_MS = 60_000;
let lastErrorNotificationTimestamp = 0;

export const addWindowEventListeners = () => {
  /**
   * If you're injecting JavaScript into the webpage (e.g., to override fetch), remember:
   * The injected script does not have access to Chrome extension APIs (like chrome.runtime.sendMessage).
   * To communicate, inject the script and use window.postMessage to send data back to the content script.
   */
  window.addEventListener('message', (event: MessageEvent) => {
    /**
     * @todo
     * - Must be namespaced to avoid page scripts spoofing controller commands
     * if (event.data?.source !== 'brie-ui') return;
     *
     * - Guard using the allowed message types
     * if (!ALLOWED_MESSAGE_TYPES.has(event.data.type)) return;
     *
     * - Use Enums
     */

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

      /**
       * Video capture flow
       */
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
