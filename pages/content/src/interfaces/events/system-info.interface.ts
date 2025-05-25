import type { BatteryInfo } from './battery-info.interface';
import type { BrowserInfo } from './browser-info.interface';
import type { ExtensionContext } from './extension-context.interface';
import type { LanguageInfo } from './language-info.interface';
import type { MemoryInfo } from './memory-info.interface';
import type { NetworkInfo } from './network-info.interface';
import type { OSInfo } from './os-info.interface';

export interface SystemInfo {
  battery: BatteryInfo;
  browser: BrowserInfo;
  os: OSInfo;
  network?: NetworkInfo | null;
  memory?: MemoryInfo | null;
  locale: LanguageInfo;
  context?: ExtensionContext;
}
