import { interceptCookies, interceptLocalStorage, interceptSessionStorage } from './application';
import { interceptConsole } from './console';
import { interceptEvents } from './events';
import { interceptFetch, interceptXHR } from './network';

/**
 * @todo #91
 */
const BLOCKED_DOMAINS = ['docs.google.com'];

// Network and event interceptors must run before page scripts execute or events
// will be missed. Console interception monkey-patches synchronously and is cheap.
if (!BLOCKED_DOMAINS.includes(window.location.host)) {
  interceptFetch();
}

interceptXHR();
interceptConsole();
interceptEvents();

// Snapshot interceptors (cookies / localStorage / sessionStorage) iterate all keys at module load —
// on pages with hundreds of keys this is synchronous work before first paint. Defer to idle.
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
