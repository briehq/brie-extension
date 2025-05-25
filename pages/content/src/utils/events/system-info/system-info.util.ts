import { getExtensionContext } from './extension-context.util';
import { parseUserAgent } from './user-agent.util';
import { getBatteryInfo } from './battery-info.util';
import { getNetworkInfo } from './network-info.util';
import { getLanguageInfo } from './language-info.util';
import { getMemoryInfo } from './memory-info.util';
import { getIncognitoStatus } from './incognito-status.util';

import type { SystemInfo } from '@src/interfaces/events';

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
      ...systemInfo.browser,
      isIncognito,
    },
    os: systemInfo.os,
    network: getNetworkInfo(),
    locale: getLanguageInfo(),
    memory: getMemoryInfo(),
    context: getExtensionContext(),
  };
};
