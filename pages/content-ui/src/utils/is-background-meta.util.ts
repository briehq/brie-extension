import type { BackgroundFitMeta } from '@src/models';

export const isBackgroundFitMeta = (v: any) => {
  return (
    v &&
    typeof v === 'object' &&
    v.sizes?.natural &&
    Number.isFinite(v.sizes.natural.width) &&
    Number.isFinite(v.sizes.natural.height)
  );
};
