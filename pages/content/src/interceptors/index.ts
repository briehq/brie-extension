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
interceptCookies();
interceptLocalStorage();
interceptSessionStorage();
