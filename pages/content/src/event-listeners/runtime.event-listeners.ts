import { runtime } from 'webextension-polyfill';

import { AUTH, CAPTURE, RECORDING, REWIND, SCREENSHOT, UI } from '@extension/shared';

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
      case AUTH.STATUS:
        window.dispatchEvent(new CustomEvent(AUTH.STATUS, { detail: payload }));
        break;

      /**
       * Screenshot capture flow
       */
      case SCREENSHOT.START:
        window.dispatchEvent(new CustomEvent(UI.LAYOUT_RECALC));
        startScreenshotCapture(payload);
        break;

      case CAPTURE.EXIT:
        cleanup();
        break;

      case UI.CLOSE_MODAL:
        window.dispatchEvent(new CustomEvent(UI.CLOSE_MODAL));
        break;

      /**
       * Video capture flow
       */
      case RECORDING.START:
        beginPreparingRecording(payload);
        startCaptureNow();
        break;

      case RECORDING.STOP:
        stopRecording();
        break;

      case RECORDING.PAUSE:
        pauseRecording();
        break;

      case RECORDING.RESUME:
        resumeRecording();
        break;

      case RECORDING.TOGGLE_MIC:
        toggleMic();
        break;

      /**
       * Rewind capture flow
       */
      case REWIND.SET_ENABLED:
        console.log('runtime: SET_ENABLED', rawMessage);

        applyEnabledState(rawMessage.payload.enabled);
        break;

      case REWIND.OPEN_REVIEW:
        window.dispatchEvent(new CustomEvent(REWIND.OPEN_REVIEW, { detail: payload }));
        window.dispatchEvent(new CustomEvent(UI.LAYOUT_RECALC));
        break;

      case REWIND.RESTART_CAPTURE:
        restartRewindCapture();
        break;

      default:
        break;
    }
  });
};
