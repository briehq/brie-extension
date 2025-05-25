import type { ExtensionContext } from '@src/interfaces/events';
import packageJsonFile from '../../../../package.json';

/** Returns extension runtime context (extension ID, host, etc.). */
export const getExtensionContext = (): ExtensionContext => {
  //   const url = chrome.runtime.getURL('./package.json');
  //   const packageJsonFile = await fetch(url).then(res => res.json());

  return {
    extensionId: chrome.runtime?.id,
    host: location.hostname,
    version: packageJsonFile.version,
  };
};
