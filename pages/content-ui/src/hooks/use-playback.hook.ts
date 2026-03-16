import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { TrimRange } from '@src/models';

interface PlaybackApi {
  duration: number;
  trimDuration: number;
  currentTime: number;
  isPlaying: boolean;
  trim: TrimRange;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (t: number) => void;
  setTrim: (next: TrimRange) => void;
}

interface Params {
  duration: number;
  getCurrentTime: () => number;
  seekRaw: (t: number) => void;
  playRaw: () => void;
  pauseRaw: () => void;
  subscribeTime: (cb: (t: number) => void) => () => void;
  subscribePlaying?: (cb: (p: boolean) => void) => () => void;

  // behavior at trim end:
  // - "pause": stop at end and stay there
  // - "loop": jump to start and keep playing
  endBehavior?: 'pause' | 'loop';
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export const usePlayback = (p: Params): PlaybackApi => {
  const endBehavior = p.endBehavior ?? 'pause';

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setPlaying] = useState(false);
  const [trim, setTrimState] = useState<TrimRange>({ start: 0, end: p.duration || 0 });

  const trimRef = useRef(trim);
  const playingRef = useRef(isPlaying);

  useEffect(() => {
    trimRef.current = trim;
  }, [trim]);

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (!p.duration) return;
    setTrimState(prev => {
      const start = clamp(prev.start, 0, p.duration);
      const end = clamp(prev.end || p.duration, 0, p.duration) || p.duration;
      return { start, end: Math.max(end, start) };
    });
  }, [p.duration]);

  useEffect(() => {
    return p.subscribeTime(t => {
      const { start, end } = trimRef.current;

      const clamped = clamp(t, start, end || p.duration);
      setCurrentTime(clamped);

      if (!playingRef.current) return;
      if (!end || end <= start) return;

      if (t >= end) {
        if (endBehavior === 'loop') {
          p.seekRaw(start);
          // keep playing
          p.playRaw();
          setCurrentTime(start);
          setPlaying(true);
        } else {
          // pause at end
          p.pauseRaw();
          p.seekRaw(end);
          setCurrentTime(end);
          setPlaying(false);
        }
      }
    });
  }, [p, endBehavior]);

  useEffect(() => {
    if (!p.subscribePlaying) return;
    return p.subscribePlaying(setPlaying);
  }, [p]);

  const setTrim = useCallback(
    (next: TrimRange) => {
      if (!p.duration) return;

      let start = clamp(next.start, 0, p.duration);
      let end = clamp(next.end, 0, p.duration);
      if (start > end) [start, end] = [end, start];

      if (end - start < 0.1) end = clamp(start + 0.1, 0, p.duration);

      setTrimState({ start, end });

      const ct = p.getCurrentTime();
      if (ct < start) p.seekRaw(start);
      if (ct > end) {
        p.pauseRaw();
        p.seekRaw(end);
        setPlaying(false);
      }
    },
    [p],
  );

  const seek = useCallback(
    (t: number) => {
      const next = clamp(t, trim.start, trim.end || p.duration);
      p.seekRaw(next);
      setCurrentTime(next);
    },
    [p, trim],
  );

  const play = useCallback(() => {
    const { start, end } = trimRef.current;
    const ct = p.getCurrentTime();

    if (ct < start) p.seekRaw(start);
    if (end && ct >= end) p.seekRaw(start);

    p.playRaw();
    setPlaying(true);
  }, [p]);

  const pause = useCallback(() => {
    p.pauseRaw();
    setPlaying(false);
  }, [p]);

  const toggle = useCallback(() => {
    if (playingRef.current) pause();
    else play();
  }, [pause, play]);

  return useMemo(
    () => ({
      duration: p.duration,
      trimDuration: Math.max(0, (trim.end || p.duration) - trim.start),
      currentTime,
      isPlaying,
      trim,
      play,
      pause,
      toggle,
      seek,
      setTrim,
    }),
    [p.duration, currentTime, isPlaying, trim, play, pause, toggle, seek, setTrim],
  );
};
