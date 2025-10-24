import { AppEventType } from '@src/constants';
import { sendEvent } from '@src/utils';

// History API interception
export const historyApiInterceptor = () => {
  const originalPushState = history.pushState;
  history.pushState = function (...args) {
    sendEvent(AppEventType.Navigate, null, { url: args[2], method: 'pushState' });
    originalPushState.apply(history, args);
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function (...args) {
    sendEvent(AppEventType.Navigate, null, { url: args[2], method: 'replaceState' });
    originalReplaceState.apply(history, args);
  };

  window.addEventListener('popstate', () => {
    sendEvent(AppEventType.Navigate, null, { url: location.href, method: 'popstate' });
  });
};
