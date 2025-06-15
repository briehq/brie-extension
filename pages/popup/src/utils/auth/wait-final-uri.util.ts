/**
 * Resolves with the full URL your <auth-identity.html> is loaded with.
 * The page must post that URL back via:
 *   browser.runtime.sendMessage(location.href)
 *
 * @param timeout  How long to wait (ms) before giving up. Default 60 s.
 */
import browser from 'webextension-polyfill';

export const waitForUri = (timeout = 60_000): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      browser.runtime.onMessage.removeListener(listener);
      reject(new Error('Auth identity timed out'));
    }, timeout);

    const listener = (url: string) => {
      clearTimeout(timer);
      browser.runtime.onMessage.removeListener(listener);
      resolve(url);
    };

    browser.runtime.onMessage.addListener(listener);
  });
};
