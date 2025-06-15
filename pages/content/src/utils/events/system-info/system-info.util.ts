import type { SystemInfo } from '@src/interfaces/events';

import { getBatteryInfo } from './battery-info.util';
import { getExtensionContext } from './extension-context.util';
import { getIncognitoStatus } from './incognito-status.util';
import { getLanguageInfo } from './language-info.util';
import { getMemoryInfo } from './memory-info.util';
import { getNetworkInfo } from './network-info.util';
import { parseUserAgent } from './user-agent.util';

/**
 * Collects environment information useful for debugging or diagnostics.
 *
 * Includes browser details, OS info, battery status, incognito mode, screen zoom,
 * network conditions, locale, and memory usage.
 *
 * @returns A promise resolving to a structured `SystemInfo` object.
 */
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
