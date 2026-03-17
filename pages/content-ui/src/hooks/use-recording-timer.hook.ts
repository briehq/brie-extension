import { useEffect, useMemo, useRef, useState } from 'react';

import type { VideoRecordingState } from '@extension/storage';

const DEFAULT_MAX_RECORDING_MS = 5 * 60 * 1000;

interface UseRecordingTimerOptions {
  /**
   * Max allowed recording duration in milliseconds.
   * Defaults to 5 minutes.
   */
  maxRecordingMs?: number;

  /**
   * Tick interval in milliseconds (UI refresh rate).
   * Defaults to 1000ms.
   */
  tickMs?: number;
}

type NullableNumber = number | null;

const nowMs = () => Date.now();

export const useRecordingTimer = (state: VideoRecordingState, options?: UseRecordingTimerOptions) => {
  const maxRecordingMs = options?.maxRecordingMs ?? DEFAULT_MAX_RECORDING_MS;
  const tickMs = options?.tickMs ?? 1000;

  const [elapsedMs, setElapsedMs] = useState(0);

  const accumulatedMsRef = useRef(0);
  const segmentStartedAtRef = useRef<NullableNumber>(null);
  const intervalIdRef = useRef<NullableNumber>(null);
  const prevStateRef = useRef<VideoRecordingState>('idle');

  const stopTicking = () => {
    if (intervalIdRef.current != null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  };

  const computeElapsed = () => {
    const startedAt = segmentStartedAtRef.current;
    const liveMs = startedAt != null ? nowMs() - startedAt : 0;
    const total = accumulatedMsRef.current + liveMs;

    return Math.min(total, maxRecordingMs);
  };

  const commitTick = () => setElapsedMs(computeElapsed());

  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;

    if (state === 'capturing') {
      if (prev !== 'capturing') {
        segmentStartedAtRef.current = nowMs();
      }

      stopTicking();
      commitTick();
      intervalIdRef.current = window.setInterval(commitTick, tickMs);

      return;
    }

    if (state === 'paused') {
      const startedAt = segmentStartedAtRef.current;
      if (startedAt != null) {
        accumulatedMsRef.current += nowMs() - startedAt;
        segmentStartedAtRef.current = null;
      }

      stopTicking();
      commitTick();

      return;
    }

    accumulatedMsRef.current = 0;
    segmentStartedAtRef.current = null;
    stopTicking();
    setElapsedMs(0);
  }, [state, tickMs, maxRecordingMs]);

  useEffect(() => stopTicking, []);

  return useMemo(() => {
    return { elapsedMs, maxMs: maxRecordingMs, isMax: elapsedMs >= maxRecordingMs };
  }, [elapsedMs, maxRecordingMs]);
};
