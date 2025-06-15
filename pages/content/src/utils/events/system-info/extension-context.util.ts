import type { ExtensionContext } from '@src/interfaces/events';

import packageJsonFile from '../../../../package.json';

/** Returns extension runtime context (extension ID, host, etc.). */
export const getExtensionContext = (): ExtensionContext => {
  /**
   * @todo
   * create a custom event to get extensionId
   */
  return {
    // extensionId: chrome.runtime?.id,
    host: location.hostname,
    version: packageJsonFile.version,
  };
};
