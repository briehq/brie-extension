import { useCallback, useEffect, useState } from 'react';

interface Fit {
  width: number;
  height: number;
  ready: boolean;
}

const contain = (
  parentWidth: number,
  parentHeight: number,
  mediaWidth: number,
  mediaHeight: number,
): { width: number; height: number } => {
  if (parentWidth <= 0 || parentHeight <= 0 || mediaWidth <= 0 || mediaHeight <= 0) {
    return { width: 0, height: 0 };
  }

  const scale = Math.min(parentWidth / mediaWidth, parentHeight / mediaHeight);

  return { width: Math.floor(mediaWidth * scale), height: Math.floor(mediaHeight * scale) };
};

/**
 * Auto-size a <video> element so it always fits inside the parent wrapper
 * without exceeding either dimension (object-fit: contain, but explicit sizing).
 */
export const useFitVideoToParent = (videoEl: HTMLVideoElement | null, parentEl: HTMLElement | null) => {
  const [fit, setFit] = useState<Fit>({ width: 0, height: 0, ready: false });

  const compute = useCallback(() => {
    if (!videoEl || !parentEl) return;

    const parentWidth = parentEl.clientWidth;
    const parentHeight = parentEl.clientHeight;

    const mediaWidth = videoEl.videoWidth || 0;
    const mediaHeight = videoEl.videoHeight || 0;

    if (!parentWidth || !parentHeight || !mediaWidth || !mediaHeight) {
      setFit(prev => ({ ...prev, ready: false }));
      return;
    }

    const next = contain(parentWidth, parentHeight, mediaWidth, mediaHeight);
    setFit({ ...next, ready: true });

    videoEl.style.width = `${next.width}px`;
    videoEl.style.height = `${next.height}px`;
  }, [parentEl, videoEl]);

  useEffect(() => {
    if (!videoEl || !parentEl) return;

    const onMeta = () => compute();
    videoEl.addEventListener('loadedmetadata', onMeta);

    const resizeObserver = new ResizeObserver(() => compute());
    resizeObserver.observe(parentEl);

    compute();

    return () => {
      videoEl.removeEventListener('loadedmetadata', onMeta);
      resizeObserver.disconnect();
    };
  }, [videoEl, parentEl, compute]);

  return fit;
};
