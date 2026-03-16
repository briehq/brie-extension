import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePlayback } from './use-playback.hook';

interface UseVideoPlaybackArgs {
  blob: Blob;
  durationMs?: number;
}

const msToSeconds = (ms?: number) => (typeof ms === 'number' && Number.isFinite(ms) && ms > 0 ? ms / 1000 : 0);

const isValidDurationSeconds = (d: number) => Number.isFinite(d) && d > 0;

export const useVideoPlayback = ({ blob, durationMs }: UseVideoPlaybackArgs) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [durationSeconds, setDurationSeconds] = useState(() => msToSeconds(durationMs));

  const videoUrl = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(videoUrl), [videoUrl]);

  useEffect(() => {
    setDurationSeconds(msToSeconds(durationMs));

    const v = videoRef.current;
    if (!v) return;

    v.pause();

    try {
      v.currentTime = 0;
    } catch {
      // ignore
    }
  }, [blob, durationMs]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const syncDurationFromElement = () => {
      const d = v.duration;
      if (!isValidDurationSeconds(d)) return;

      setDurationSeconds(prev => (d > prev ? d : prev));
    };

    v.addEventListener('loadedmetadata', syncDurationFromElement);
    v.addEventListener('durationchange', syncDurationFromElement);

    syncDurationFromElement();

    return () => {
      v.removeEventListener('loadedmetadata', syncDurationFromElement);
      v.removeEventListener('durationchange', syncDurationFromElement);
    };
  }, [videoUrl]);

  /**
   * Subscribe to currentTime updates.
   * Uses requestAnimationFrame while playing for smoother UI than `timeupdate`.
   */
  const subscribeCurrentTime = useCallback((cb: (t: number) => void) => {
    let rafId: number | null = null;
    let active = true;

    const tick = () => {
      if (!active) return;
      const v = videoRef.current;
      cb(v?.currentTime ?? 0);
      rafId = window.requestAnimationFrame(tick);
    };

    const onPlay = () => {
      if (rafId == null) rafId = window.requestAnimationFrame(tick);
    };

    const onPauseOrEnded = () => {
      if (rafId != null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }

      const v = videoRef.current;
      cb(v?.currentTime ?? 0);
    };

    const v = videoRef.current;
    if (v) {
      v.addEventListener('play', onPlay);
      v.addEventListener('pause', onPauseOrEnded);
      v.addEventListener('ended', onPauseOrEnded);

      if (!v.paused && !v.ended) onPlay();
    } else {
      cb(0);
    }

    return () => {
      active = false;
      if (rafId != null) window.cancelAnimationFrame(rafId);

      const vv = videoRef.current;
      if (vv) {
        vv.removeEventListener('play', onPlay);
        vv.removeEventListener('pause', onPauseOrEnded);
        vv.removeEventListener('ended', onPauseOrEnded);
      }
    };
  }, []);

  /**
   * Subscribe to play/pause state changes.
   */
  const subscribeIsPlaying = useCallback((cb: (isPlaying: boolean) => void) => {
    const v = videoRef.current;

    const emit = () => {
      const vv = videoRef.current;
      cb(!!vv && !vv.paused && !vv.ended);
    };

    const onPlay = () => cb(true);
    const onPause = () => cb(false);
    const onEnded = () => cb(false);

    emit();

    if (!v) return () => {};

    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('ended', onEnded);

    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('ended', onEnded);
    };
  }, []);

  const playbackApi = usePlayback({
    duration: durationSeconds,

    getCurrentTime: () => videoRef.current?.currentTime ?? 0,

    seekRaw: t => {
      const v = videoRef.current;
      if (!v) return;
      try {
        v.currentTime = t;
      } catch {
        // ignore
      }
    },

    playRaw: () => {
      const v = videoRef.current;
      if (!v) return;

      const p = v.play();
      if (p && typeof p.catch === 'function') {
        p.catch(err => {
          // Don't swallow unexpected errors silently in dev.
          // Autoplay restrictions are common and not actionable here.
          if (process.env.NODE_ENV !== 'production') {
            const msg = String((err as any)?.message ?? err);
            if (!msg.toLowerCase().includes('play') && !msg.toLowerCase().includes('autoplay')) {
              console.warn('[useVideoPlayback] play() failed:', err);
            }
          }
        });
      }
    },

    pauseRaw: () => {
      videoRef.current?.pause();
    },

    subscribeTime: subscribeCurrentTime,

    subscribePlaying: subscribeIsPlaying,
  });

  return { videoRef, url: videoUrl, api: playbackApi };
};
