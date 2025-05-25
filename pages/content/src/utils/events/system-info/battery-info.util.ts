import type { BatteryInfo } from '@src/interfaces/events';

/** Retrieves battery charging status and level. */
export const getBatteryInfo = async (): Promise<BatteryInfo> => {
  if ('getBattery' in navigator) {
    const battery = await (navigator as any).getBattery();
    return {
      charging: battery.charging,
      level: battery.level,
    };
  }

  return { charging: false, level: 1 };
};
