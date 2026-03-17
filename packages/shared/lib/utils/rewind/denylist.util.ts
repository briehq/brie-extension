import { BASELINE_DENYLIST } from '../../constants/index.js';
import type { BlockRule, HostPattern, PathHint } from '../../interfaces/index.js';

const matchHost = (hostname: string, pattern: HostPattern): boolean => {
  switch (pattern.type) {
    case 'exact':
      return hostname === pattern.host;

    case 'suffix':
      return hostname === pattern.suffix || hostname.endsWith(`.${pattern.suffix}`);

    case 'prefix':
      return hostname.startsWith(`${pattern.prefix}.`);

    default:
      return false;
  }
};

const matchPath = (pathname: string, hint: PathHint): boolean => {
  switch (hint.type) {
    case 'contains':
      return pathname.includes(hint.value);
    default:
      return false;
  }
};

export const isRewindBlocked = (
  url: string,
  rules: BlockRule[] = BASELINE_DENYLIST,
): { blocked: boolean; reason?: string } => {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return { blocked: false };
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();

  for (const rule of rules) {
    const hostMatch = rule.hosts.some(h => matchHost(hostname, h));
    if (!hostMatch) continue;

    if (!rule.paths || rule.paths.some(p => matchPath(pathname, p))) {
      return { blocked: true, reason: rule.reason };
    }
  }

  return { blocked: false };
};
