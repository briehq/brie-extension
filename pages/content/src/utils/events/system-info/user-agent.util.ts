import type { BrowserInfo, OSInfo } from '@src/interfaces';

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

export const parseUserAgent = async (): Promise<{ browser: BrowserInfo; os: OSInfo }> => {
  // Non-Chromium browsers (Firefox / Safari) — userAgentData isn't available, so parse the UA string.
  if (browserName === 'Unknown' && browserVersion === 'Unknown') {
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
        // Windows 10 and 11 share NT 10.0 in the UA string — userAgentData (Chromium-only) would
        // disambiguate, but Firefox can't, so report "10/11".
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

    if ((userAgent.includes('safari') || userAgent.includes('Safari')) && !userAgent.includes('chrome')) {
      browserName = 'Safari';
      browserVersion = userAgent.match(/version\/([\d.]+)/)?.[1] || '';
      osVersion = userAgent.match(/OS ([\d_]+)/i)?.[1]?.replace(/_/g, '.') || 'Unknown';
      osName = 'Mac OS';
    }
  }

  if (/iphone|ipad|ipod/.test(userAgent)) {
    osName = 'iOS';
    osVersion = userAgent.match(/OS ([\d_]+)/i)?.[1]?.replace(/_/g, '.') || 'Unknown';
  } else if (platform.includes('android')) {
    osName = 'Android';
    osVersion = userAgent.match(/Android ([\d.]+)/i)?.[1] || 'Unknown';
  } else if (platform.includes('linux')) {
    osName = 'Linux';
  }

  // Chromium-based browsers (Chrome, Edge, Brave, Opera) — use userAgentData.
  if (browserName === 'Unknown' && browserVersion === 'Unknown') {
    const brands: Array<{ brand: string; version: string }> = uaData.brands || [];
    const brandInfo =
      brands.find(b => /chrome|chromium|edge|opera|brave/i.test(b.brand)) ||
      brands.find(b => b.brand !== 'Not)A;Brand'); // fallback

    browserName = brandInfo?.brand || 'Chromium';
    browserVersion = brandInfo?.version || '';

    osName = uaData.platform || osName || 'Unknown';
    osVersion = await getWindowsVersion();

    if (!browserName || browserName === 'Unknown') {
      if (/edg/i.test(userAgent)) browserName = 'Edge';
      else if (/opr\//i.test(userAgent)) browserName = 'Opera';
      else if (/brave/i.test(userAgent)) browserName = 'Brave';
      else if (/chrome/i.test(userAgent)) browserName = 'Chrome';
    }

    if (!browserVersion || browserVersion === 'Unknown') {
      browserVersion = userAgent.match(/(?:chrome|chromium)\/([\d.]+)/)?.[1] || '';
    }
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
