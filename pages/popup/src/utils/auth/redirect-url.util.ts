import { identity, runtime } from 'webextension-polyfill';

export const getRedirectURL = () => {
  if (identity?.getRedirectURL) {
    return identity.getRedirectURL();
  }

  return runtime.getURL('auth-identity.html');
};
