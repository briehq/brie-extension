import { AppEventType } from '@src/constants';
import { sendEvent } from '@src/utils';

/** Dispatched on every SPA URL transition (pushState / replaceState / popstate). */
const BRIE_URL_CHANGED_EVENT = 'brie:url-changed';

let historyInterceptorInstalled = false;

const historyApiInterceptor = () => {
  if (historyInterceptorInstalled) return;
  historyInterceptorInstalled = true;

  const dispatchUrlChanged = () => {
    window.dispatchEvent(new CustomEvent(BRIE_URL_CHANGED_EVENT));
  };

  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    sendEvent(AppEventType.Navigate, null, { url: args[2], method: 'pushState' });
    const result = originalPushState.apply(history, args);
    dispatchUrlChanged();
    return result;
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    sendEvent(AppEventType.Navigate, null, { url: args[2], method: 'replaceState' });
    const result = originalReplaceState.apply(history, args);
    dispatchUrlChanged();
    return result;
  };

  window.addEventListener('popstate', () => {
    sendEvent(AppEventType.Navigate, null, { url: location.href, method: 'popstate' });
    dispatchUrlChanged();
  });
};

export { BRIE_URL_CHANGED_EVENT, historyApiInterceptor };
