import {
  cleanup,
  startScreenshotCapture,
  pauseRecording,
  resumeRecording,
  stopRecording,
  toggleMic,
  beginPreparingRecording,
  startCaptureNow,
} from '@src/capture';

export const addRuntimeEventListeners = () => {
  chrome.runtime.onMessage.addListener((rawMessage: any) => {
    if (!rawMessage || typeof rawMessage !== 'object') return;

    const { action, payload } = rawMessage;

    switch (action) {
      /**
       * Auth flow
       */
      case 'AUTH_STATUS':
        window.dispatchEvent(new CustomEvent('AUTH_STATUS', { detail: payload }));
        break;

      /**
       * Screenshot capture flow
       * @todo
       * - refactor event names to match the flow name
       */
      case 'START_SCREENSHOT':
        window.dispatchEvent(new CustomEvent('metadata'));
        startScreenshotCapture(payload);
        break;

      case 'EXIT_CAPTURE':
        cleanup();
        break;

      case 'CLOSE_MODAL':
        window.dispatchEvent(new CustomEvent('CLOSE_MODAL'));
        break;

      /**
       * Video capture flow
       */
      case 'START_RECORDING':
        console.log('helo recording case');

        beginPreparingRecording(payload);

        startCaptureNow();
        break;

      case 'STOP_RECORDING':
        stopRecording();
        break;

      case 'PAUSE_RECORDING':
        pauseRecording();
        break;

      case 'RESUME_RECORDING':
        resumeRecording();
        break;

      case 'TOGGLE_MIC':
        toggleMic();
        break;

      default:
        break;
    }
  });
};
