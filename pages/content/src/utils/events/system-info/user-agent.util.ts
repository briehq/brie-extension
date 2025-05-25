import type { BrowserInfo, OSInfo } from '@src/interfaces/events';
import { isDevToolsOpen, isLikelyEmulated } from './detect-emulation.util';
import { getBrowserZoomLevel } from './zoom-level.util';

/** Parses navigator.userAgent and userAgentData to extract browser and OS info. */
export const parseUserAgent = (): { browser: BrowserInfo; os: OSInfo } => {
  const uaData = navigator?.userAgentData || {};
  const userAgent = navigator.userAgent;

  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  let osName = 'Unknown';
  let osVersion = 'Unknown';

  if (uaData?.brands) {
    const browserInfo = uaData.brands.find(b =>
      ['chrome', 'edge', 'safari'].some(name => b.brand.toLowerCase().includes(name)),
    );
    if (browserInfo) {
      browserName = browserInfo.brand;
      browserVersion = browserInfo.version;
    }
  } else {
    const match = userAgent.match(/(Chrome|Firefox|Safari|Edg|Opera|Brave)\/([\d.]+)/);
    if (match) {
      browserName = match[1];
      browserVersion = match[2];
    }
  }

  const platform = uaData.platform?.toLowerCase() || navigator.platform?.toLowerCase() || '';
  if (platform.includes('mac')) {
    osName = 'Mac OS';
    osVersion = userAgent.match(/Mac OS X ([\d_.]+)/)?.[1]?.replace(/_/g, '.') || 'Unknown';
  } else if (platform.includes('win')) {
    osName = 'Windows';
    osVersion = userAgent.match(/Windows NT ([\d.]+)/)?.[1] || 'Unknown';
  } else if (platform.includes('linux')) {
    osName = 'Linux';
  } else if (platform.includes('android')) {
    osName = 'Android';
    osVersion = userAgent.match(/Android ([\d.]+)/)?.[1] || 'Unknown';
  } else if (/iphone|ipad|ipod/.test(userAgent.toLowerCase())) {
    osName = 'iOS';
    osVersion = userAgent.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') || 'Unknown';
  }

  return {
    browser: {
      name: browserName,
      version: browserVersion,
      ...getBrowserZoomLevel(),
      isIncognito: false,
      emulation: {
        isLikelyEmulated: isLikelyEmulated(),
        isDevToolsOpen: isDevToolsOpen(),
      },
    },
    os: {
      name: osName,
      version: osVersion,
    },
  };
};
