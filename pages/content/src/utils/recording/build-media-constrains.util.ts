import type { CaptureOptions } from '../../interfaces';

export const buildDisplayMediaConstraints = (opts: CaptureOptions): MediaStreamConstraints => {
  const isDesktop = opts.captureType === 'desktop';
  const enableAudio = opts.audio;

  return {
    preferCurrentTab: !isDesktop,
    audio: enableAudio,
    video: {
      displaySurface: isDesktop ? 'monitor' : 'browser',
    } as any,
  };
};
