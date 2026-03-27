import type { CaptureOptions } from '../../interfaces';

export const buildDisplayMediaConstraints = (captureType: CaptureOptions['captureType']): MediaStreamConstraints => {
  const isDesktop = captureType === 'desktop';

  return {
    preferCurrentTab: !isDesktop,
    audio: false,
    video: {
      displaySurface: isDesktop ? 'monitor' : 'browser',
    } as any,
  };
};
