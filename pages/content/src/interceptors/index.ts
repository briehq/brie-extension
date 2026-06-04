import { interceptCookies, interceptLocalStorage, interceptSessionStorage } from './application';
import { interceptConsole } from './console';
import { interceptEvents } from './events';
import { interceptFetch, interceptXHR } from './network';

/**
 * @todo #91
 */
const BLOCKED_DOMAINS = ['docs.google.com'];

if (!BLOCKED_DOMAINS.includes(window.location.host)) {
  interceptFetch();
}

interceptXHR();
interceptConsole();
interceptEvents();

type RIC = (cb: () => void, opts?: { timeout?: number }) => number;
const ric = (window as unknown as { requestIdleCallback?: RIC }).requestIdleCallback;
const runSnapshotInterceptors = () => {
  interceptCookies();
  interceptLocalStorage();
  interceptSessionStorage();
};

if (typeof ric === 'function') {
  ric(runSnapshotInterceptors, { timeout: 2000 });
} else {
  setTimeout(runSnapshotInterceptors, 0);
}
