import { MessageAction } from '@extension/shared';

import { cleanup, startScreenshotCapture } from '@src/capture';

export const addRuntimeEventListeners = () => {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === MessageAction.START_SCREENSHOT) {
      window.dispatchEvent(new CustomEvent('metadata'));

      startScreenshotCapture(msg.payload);
    }

    if (msg.action === MessageAction.EXIT_CAPTURE) {
      cleanup();
    }

    if (msg.action === MessageAction.CLOSE_MODAL) {
      window.dispatchEvent(new CustomEvent('CLOSE_MODAL'));
    }
  });
};
