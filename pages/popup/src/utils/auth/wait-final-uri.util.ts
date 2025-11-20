/**
 * Resolves with the full URL your <auth-identity.html> is loaded with.
 * The page must post that URL back via:
 *   browser.runtime.sendMessage(location.href)
 *
 * @param timeout  How long to wait (ms) before giving up. Default 60 s.
 */
import { runtime } from 'webextension-polyfill';

export const waitForUri = (timeout = 60_000): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      runtime.onMessage.removeListener(listener);
      reject(new Error('Auth identity timed out'));
    }, timeout);

    const listener: any = (url: string) => {
      clearTimeout(timer);
      runtime.onMessage.removeListener(listener);
      resolve(url);
    };

    runtime.onMessage.addListener(listener);
  });
};
