import { MessageType } from '@extension/shared';

export const addWindowEventListeners = () => {
  /**
   * If you're injecting JavaScript into the webpage (e.g., to override fetch), remember:
   * The injected script does not have access to Chrome extension APIs (like chrome.runtime.sendMessage).
   * To communicate, inject the script and use window.postMessage to send data back to the content script.
   */
  window.addEventListener('message', event => {
    if (event.source !== window || !event.data.type) return;

    if (event.data.type === MessageType.ADD_RECORD) {
      try {
        chrome.runtime.sendMessage({ type: MessageType.ADD_RECORD, data: event.data.payload });
      } catch (err) {
        console.error('[sendMessage error]', chrome.runtime.id, err);
      }
    }
  });
};
