import type { BrowserInfo, OSInfo } from '@src/interfaces/events';

import { isDevToolsOpen, isLikelyEmulated } from './detect-emulation.util';
import { getBrowserZoomLevel } from './zoom-level.util';

const userAgent = navigator.userAgent.toLowerCase();
const uaData = (navigator as any).userAgentData || {};
const platform = userAgent || '';
let browserName = 'Unknown';
let browserVersion = 'Unknown';
let osName = 'Unknown';
let osVersion = 'Unknown';

const getWindowsVersion = async (): Promise<string> => {
  if (uaData.getHighEntropyValues) {
    const data = await uaData.getHighEntropyValues(['platform', 'platformVersion']);
    if (data.platform === 'Windows') {
      const version = parseInt(data.platformVersion.split('.')[0], 10);
      return version >= 13 ? '11' : '10';
    }
  }

  return '';
};

/** Parses navigator.userAgent to extract browser and OS info. */
export const parseUserAgent = async (): Promise<{ browser: BrowserInfo; os: OSInfo }> => {
  //   FIrst approach would be :
  //   detect browser using browser name and browser version using uaData !
  // uaData - for browser : Chrome, Edge, Opera, Dia, Brave, Samsung Internet as they are chromium based

  //  for non chromium based browser (Firefox / Safari) running on macos or on lInux
  if (browserName === 'Unknown' && browserVersion === 'Unknown') {
    // for firefox
    if (userAgent.includes('firefox') || userAgent.includes('Firefox')) {
      browserName = 'Firefox';
      browserVersion = userAgent.match(/firefox\/([\d.]+)/)?.[1] || '';
      const matchMac = userAgent.match(/mac os /i);
      const matchLinux = userAgent.match(/linux/i);
      const matchWin = userAgent.match(/windows/i);
      if (matchMac) {
        osName = 'Mac OS';
        osVersion = userAgent.match(/OS ([\d_]+)/i)?.[1]?.replace(/_/g, '.') || 'Unknown';
      } else if (matchLinux) {
        osName = 'Linux';
        const distroMatch = userAgent.match(/\(([^)]+)\)/);
        if (distroMatch) {
          const parts = distroMatch[1].split(';').map(p => p.trim());
          const distro = parts.find(p => /Ubuntu|Fedora|Debian|Arch|Mint|Linux/i.test(p)) || 'Unknown Linux distro';
          const architecture = parts.find(p => /x86_64|i686|arm|aarch64|amd64/i.test(p)) || 'Unknown architecture';
          osVersion = `${distro} ${architecture}`;
        }

        osVersion = '';
      } else if (matchWin) {
        // when firefox is running on windows machine
        // navigator.userAgentData api is not available for NON-Chromium browser so need to output as 10/11
        osName = 'Windows';
        const match = userAgent.match(/windows nt ([\d.]+)/);
        if (match) {
          const versionMap: Record<string, string> = {
            '10.0': '10/11',
            '6.3': '8.1',
            '6.2': '8',
            '6.1': '7',
          };
          osVersion = versionMap[match[1]] || '';
        }
      }
    }

    // for safari
    if ((userAgent.includes('safari') || userAgent.includes('Safari')) && !userAgent.includes('chrome')) {
      browserName = 'Safari';
      browserVersion = userAgent.match(/version\/([\d.]+)/)?.[1] || '';
      osVersion = userAgent.match(/OS ([\d_]+)/i)?.[1]?.replace(/_/g, '.') || 'Unknown';
      osName = 'Mac OS';
    }
  }

  // now for mobile devices  based browsers like

  if (/iphone|ipad|ipod/.test(userAgent)) {
    osName = 'iOS';
    osVersion = userAgent.match(/OS ([\d_]+)/i)?.[1]?.replace(/_/g, '.') || 'Unknown';
  } else if (platform.includes('android')) {
    osName = 'Android';
    osVersion = userAgent.match(/Android ([\d.]+)/i)?.[1] || 'Unknown';
  } else if (platform.includes('linux')) {
    osName = 'Linux';
  }

  // WHEN OS is windows need to configure the OSVERSION
  // this is applied  for Chromium
  if (browserName === 'Unknown' && browserVersion === 'Unknown') {
    const brands = uaData.brands;
    browserName = brands[0].brand;
    browserVersion = brands[0].version;
    osName = uaData.platform;
    osVersion = await getWindowsVersion();
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
