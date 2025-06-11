import type { BrowserInfo, OSInfo } from '@src/interfaces/events';

import { isDevToolsOpen, isLikelyEmulated } from './detect-emulation.util';
import { getBrowserZoomLevel } from './zoom-level.util';

/** Parses navigator.userAgent to extract browser and OS info. */
export const parseUserAgent = (): { browser: BrowserInfo; os: OSInfo } => {
  const userAgent = navigator.userAgent.toLowerCase();

  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  let osName = 'Unknown';
  let osVersion = 'Unknown';

  // Browser detection
  if (userAgent.includes('firefox') || userAgent.includes('Firefox')) {
    browserName = 'Firefox';
    browserVersion = userAgent.match(/firefox\/([\d.]+)/)?.[1] || 'Unknown';
  } else if ((userAgent.includes('safari') || userAgent.includes('Safari')) && !userAgent.includes('chrome')) {
    browserName = 'Safari';
    browserVersion = userAgent.match(/version\/([\d.]+)/)?.[1] || 'Unknown';
  } else if (userAgent.includes('Edg')) {
    browserName = 'Edge';
    browserVersion = userAgent.match(/edg\/([\d.]+)/)?.[1] || 'Unknown';
  } else if (userAgent.includes('chrome') || userAgent.includes('Chrome')) {
    browserName = 'Chrome';
    browserVersion = userAgent.match(/Chrome\/(\d+)/i)?.[1] || 'Unknown';
  } else if (userAgent.includes('Opera')) {
    browserName = 'Opera';
    browserVersion = userAgent.match(/opera\/([\d.]+)/)?.[1] || 'Unknown';
  }

  const platform = userAgent || '';
  if (platform.includes('mac')) {
    osName = 'Mac OS';
  } else if (platform.includes('win')) {
    osName = 'Windows';
    osVersion = userAgent.match(/Windows NT ([\d.]+)/)?.[1] || 'Unknown';
  } else if (/iphone|ipad|ipod/.test(userAgent)) {
    osName = 'iOS';
    osVersion = userAgent.match(/OS ([\d_]+)/i)?.[1]?.replace(/_/g, '.') || 'Unknown';
  } else if (platform.includes('android')) {
    osName = 'Android';
    osVersion = userAgent.match(/Android ([\d.]+)/i)?.[1] || 'Unknown';
  } else if (platform.includes('linux')) {
    osName = 'Linux';
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
