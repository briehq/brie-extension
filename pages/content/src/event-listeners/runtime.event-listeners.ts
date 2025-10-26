import { cleanup, startScreenshotCapture } from '@src/capture';

export const addRuntimeEventListeners = () => {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'AUTH_STATUS') {
      window.dispatchEvent(new CustomEvent('AUTH_STATUS', { detail: msg.payload }));
    }

    if (msg.action === 'START_SCREENSHOT') {
      window.dispatchEvent(new CustomEvent('metadata'));

      startScreenshotCapture(msg.payload);
    }

    if (msg.action === 'EXIT_CAPTURE') {
      cleanup();
    }

    if (msg.action === 'CLOSE_MODAL') {
      window.dispatchEvent(new CustomEvent('CLOSE_MODAL'));
    }
  });
};
