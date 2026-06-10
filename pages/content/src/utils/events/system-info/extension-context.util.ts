import type { ExtensionContext } from '@src/interfaces';

import packageJsonFile from '../../../../package.json';

export const getExtensionContext = (): ExtensionContext => {
  return {
    host: location.hostname,
    version: packageJsonFile.version,
  };
};
