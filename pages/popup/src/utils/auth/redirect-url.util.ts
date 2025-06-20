import browser from 'webextension-polyfill';

export const getRedirectURL = () => {
  if (browser.identity?.getRedirectURL) {
    return browser.identity.getRedirectURL();
  }

  return browser.runtime.getURL('auth-identity.html');
};
