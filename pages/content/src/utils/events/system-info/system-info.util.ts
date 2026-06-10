import type { SystemInfo } from '@src/interfaces';

import { getBatteryInfo } from './battery-info.util';
import { getExtensionContext } from './extension-context.util';
import { getIncognitoStatus } from './incognito-status.util';
import { getLanguageInfo } from './language-info.util';
import { getMemoryInfo } from './memory-info.util';
import { getNetworkInfo } from './network-info.util';
import { parseUserAgent } from './user-agent.util';

export const getSystemInfo = async (): Promise<SystemInfo> => {
  const systemInfo = parseUserAgent();
  const [isIncognito, batteryInfo] = await Promise.all([getIncognitoStatus(), getBatteryInfo()]);

  return {
    battery: batteryInfo,
    browser: {
      ...(await systemInfo).browser,
      isIncognito,
    },
    os: (await systemInfo).os,
    network: getNetworkInfo(),
    locale: getLanguageInfo(),
    memory: getMemoryInfo(),
    context: getExtensionContext(),
  };
};
