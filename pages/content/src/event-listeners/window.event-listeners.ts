import { pauseRecording, resumeRecording, startCaptureNow, stopRecording, toggleMic } from '@src/capture';

type UIInboundMessage =
  | { type: 'COUNTDOWN_FINISHED' }
  | { type: 'ADD_RECORD'; payload: any }
  | { type: 'PAUSE_RECORDING'; payload: any }
  | { type: 'RESUME_RECORDING'; payload: any }
  | { type: 'STOP_RECORDING'; payload: any }
  | { type: 'TOGGLE_MIC'; payload: any };

const ALLOWED_MESSAGE_TYPES = new Set(['COUNTDOWN_FINISHED', 'ADD_RECORD']);

export const addWindowEventListeners = () => {
  /**
   * If you're injecting JavaScript into the webpage (e.g., to override fetch), remember:
   * The injected script does not have access to Chrome extension APIs (like chrome.runtime.sendMessage).
   * To communicate, inject the script and use window.postMessage to send data back to the content script.
   */
  window.addEventListener('message', (event: MessageEvent<UIInboundMessage>) => {
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
      case 'ADD_RECORD': {
        const payload = event.data.payload;
        if (!payload) {
          console.warn('[ADD_RECORD] Missing payload');
          return;
        }

        chrome.runtime.sendMessage({ type: 'ADD_RECORD', data: payload }, () => {
          if (chrome.runtime.lastError) {
            console.error('[ADD_RECORD error]', chrome.runtime.lastError);
          }
        });

        break;
      }

      case 'PAUSE_RECORDING':
        pauseRecording();
        break;

      case 'RESUME_RECORDING':
        resumeRecording();
        break;

      case 'STOP_RECORDING':
        stopRecording();
        break;

      case 'TOGGLE_MIC':
        toggleMic();
        break;

      default:
        break;
    }
  });
};
