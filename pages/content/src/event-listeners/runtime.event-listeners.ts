import { runtime } from 'webextension-polyfill';

import {
  cleanup,
  startScreenshotCapture,
  pauseRecording,
  resumeRecording,
  stopRecording,
  toggleMic,
  beginPreparingRecording,
  startCaptureNow,
  applyEnabledState,
} from '@src/capture';
import { restartRewindCapture } from '@src/capture/rewind.capture';

export const addRuntimeEventListeners = () => {
  runtime.onMessage.addListener((rawMessage: any) => {
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

      /**
       * Rewind capture flow
       */
      case 'REWIND/SET_ENABLED':
        console.log('runtime: SET_ENABLED', rawMessage);

        applyEnabledState(rawMessage.payload.enabled);
        break;

      case 'REWIND/OPEN_REVIEW':
        window.dispatchEvent(new CustomEvent('REWIND/OPEN_REVIEW', { detail: payload }));
        window.dispatchEvent(new CustomEvent('metadata'));
        break;

      case 'REWIND/RESTART_CAPTURE':
        restartRewindCapture();
        break;

      default:
        break;
    }
  });
};
