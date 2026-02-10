/* eslint-disable jsx-a11y/role-has-required-aria-props */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { NetworkRecord, RecordLike, Segment } from '@extension/shared';
import { formatDurationMs } from '@extension/shared';
import { Button, cn, Icon } from '@extension/ui';

import type { TrimRange, VideoFormat } from '@src/models';
import { getNetworkStatus, severityFromConsole, severityFromHttpStatus } from '@src/utils';

import { EventsDropdown } from './events-dropdown.ui';
import { ExportVideoButton } from './export-video.ui';

type PointerAction = 'none' | 'scrub' | 'trimStart' | 'trimEnd' | 'trimWindow';
type EventMarker = RecordLike & { videoSeconds: number };
interface PlaybackStripProps {
  startedAt: number;
  endedAt: number;
  segments: Segment[];
  enableTrim: boolean;
  disableExport: boolean;
  api: {
    duration: number;
    currentTime: number;
    isPlaying: boolean;
    trim: TrimRange;
    toggle: () => void;
    seek: (seconds: number) => void;
    setTrim: (trim: TrimRange) => void;
  };
  events?: RecordLike[];
  showEventsMenu: boolean;
  onExport: (format: VideoFormat) => void;
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

const ratioFromSeconds = (seconds: number, durationSeconds: number) => {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0;

  return clamp(seconds / durationSeconds, 0, 1) * 100;
};

const secondsFromPointer = (e: PointerEvent, el: HTMLElement, durationSeconds: number) => {
  const rect = el.getBoundingClientRect();
  const x = clamp(e.clientX - rect.left, 0, rect.width);
  const r = rect.width ? x / rect.width : 0;

  return r * durationSeconds;
};

const normalizeTrim = (trim: TrimRange, duration: number): TrimRange => {
  const start = clamp(trim.start, 0, duration);
  const end = clamp(trim.end, 0, duration);

  if (start <= end) return { start, end };

  return { start: end, end: start };
};

const normalizeSegments = (segments: Segment[]): Segment[] => {
  const clean = segments
    .filter(s => Number.isFinite(s.startAt) && Number.isFinite(s.endAt) && s.endAt > s.startAt)
    .slice()
    .sort((a, b) => a.startAt - b.startAt);

  const out: Segment[] = [];
  for (const s of clean) {
    const last = out[out.length - 1];
    if (!last) out.push({ ...s });
    else if (s.startAt <= last.endAt) {
      last.endAt = Math.max(last.endAt, s.endAt);
    } else {
      out.push({ ...s });
    }
  }
  return out;
};

/**
 * Converts an absolute timestamp (ms) to "video time" seconds using recorded segments.
 * Returns null if the timestamp is not inside any recorded segment (pause gap/outside).
 */
const toVideoSeconds = (tsMs: number, segments: Segment[]): number | null => {
  if (!Number.isFinite(tsMs) || segments.length === 0) return null;

  let accumulatedMs = 0;

  for (const s of segments) {
    if (tsMs < s.startAt) return null;

    if (tsMs <= s.endAt) {
      accumulatedMs += tsMs - s.startAt;
      return accumulatedMs / 1000;
    }
    accumulatedMs += s.endAt - s.startAt;
  }

  return null;
};

export const PlaybackStrip = ({
  startedAt,
  endedAt,
  api,
  enableTrim = false,
  segments = [],
  events = [],
  disableExport,
  showEventsMenu = false,
  onExport,
}: PlaybackStripProps) => {
  const { duration, currentTime, isPlaying, trim, setTrim, seek, toggle } = api;

  const stripRef = useRef<HTMLDivElement | null>(null);
  const actionRef = useRef<PointerAction>('none');
  const pointerIdRef = useRef<number | null>(null);
  const dragOriginRef = useRef<{ pointerSeconds: number; trim: TrimRange } | null>(null);

  const [activeAction, setActiveAction] = useState<PointerAction>('none');
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);

  const normalizedSegments = useMemo(() => normalizeSegments(segments), [segments]);

  const visibleEvents = useMemo<EventMarker[]>(() => {
    if (!duration || !Number.isFinite(startedAt) || !Number.isFinite(endedAt)) {
      return [];
    }
    if (normalizedSegments.length === 0) {
      return [];
    }

    const out: EventMarker[] = [];

    for (const event of events) {
      const { timestamp } = event;

      if (!Number.isFinite(timestamp) || timestamp < startedAt || timestamp > endedAt) {
        continue;
      }

      const videoSeconds = toVideoSeconds(timestamp, normalizedSegments);

      if (!videoSeconds) {
        continue;
      }

      if (videoSeconds < 0 || videoSeconds > duration) {
        continue;
      }

      out.push({ ...event, videoSeconds });
    }

    out.sort((a, b) => a.videoSeconds - b.videoSeconds);

    return out;
  }, [events, startedAt, endedAt, duration, normalizedSegments]);

  const stopPointerAction = useCallback(() => {
    actionRef.current = 'none';
    pointerIdRef.current = null;
    dragOriginRef.current = null;

    setActiveAction('none');
  }, []);

  const applyTrim = useCallback((next: TrimRange) => setTrim(normalizeTrim(next, duration)), [duration, setTrim]);

  const onGlobalPointerMove = useCallback(
    (e: PointerEvent) => {
      const action = actionRef.current;
      if (action === 'none') return;

      const el = stripRef.current;
      if (!el || !duration) return;

      const pointerSeconds = secondsFromPointer(e, el, duration);

      if (action === 'scrub') {
        seek(pointerSeconds);
        return;
      }

      const origin = dragOriginRef.current;
      if (!origin) return;

      if (action === 'trimStart') {
        applyTrim({ start: pointerSeconds, end: origin.trim.end });
        return;
      }

      if (action === 'trimEnd') {
        applyTrim({ start: origin.trim.start, end: pointerSeconds });
        return;
      }

      if (action === 'trimWindow') {
        const delta = pointerSeconds - origin.pointerSeconds;
        applyTrim({
          start: origin.trim.start + delta,
          end: origin.trim.end + delta,
        });
      }
    },
    [duration, seek, applyTrim],
  );

  const onGlobalPointerUp = useCallback(
    (e: PointerEvent) => {
      if (actionRef.current === 'none') return;

      const el = stripRef.current;
      const pid = pointerIdRef.current;

      if (el && pid != null) {
        try {
          el.releasePointerCapture(pid);
        } catch {
          // ignore
        }
      }

      stopPointerAction();
      e.preventDefault();
      e.stopPropagation();
    },
    [stopPointerAction],
  );

  useEffect(() => {
    window.addEventListener('pointermove', onGlobalPointerMove, { capture: true });
    window.addEventListener('pointerup', onGlobalPointerUp, { capture: true });
    window.addEventListener('pointercancel', onGlobalPointerUp, { capture: true });

    return () => {
      window.removeEventListener('pointermove', onGlobalPointerMove, { capture: true });
      window.removeEventListener('pointerup', onGlobalPointerUp, { capture: true });
      window.removeEventListener('pointercancel', onGlobalPointerUp, { capture: true });
    };
  }, [onGlobalPointerMove, onGlobalPointerUp]);

  const startPointerAction = useCallback(
    (action: PointerAction) => (e: React.PointerEvent) => {
      if (!duration) return;

      const el = stripRef.current;
      if (!el) return;

      e.preventDefault();
      e.stopPropagation();

      actionRef.current = action;
      pointerIdRef.current = e.pointerId;
      setActiveAction(action);

      const pointerSeconds = secondsFromPointer(e.nativeEvent, el, duration);
      dragOriginRef.current = { pointerSeconds, trim: normalizeTrim(trim, duration) };

      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      if (action === 'scrub') seek(pointerSeconds);
    },
    [duration, seek, trim],
  );

  const trimNormalized = useMemo(() => normalizeTrim(trim, duration), [trim, duration]);
  const playheadPercentage = ratioFromSeconds(currentTime, duration);
  const trimStartPercentage = ratioFromSeconds(trimNormalized.start, duration);
  const trimEndPercentage = ratioFromSeconds(trimNormalized.end, duration);
  const trimWidthPercentage = Math.max(0, trimEndPercentage - trimStartPercentage);

  const showTrimStartTip = activeAction === 'trimStart' || activeAction === 'trimWindow';
  const showTrimEndTip = activeAction === 'trimEnd' || activeAction === 'trimWindow';
  const showPlayheadTip = activeAction === 'scrub' || activeAction === 'trimWindow';

  const durationLabel = useMemo(() => formatDurationMs(duration * 1000), [duration]);
  const trimStartLabel = useMemo(() => formatDurationMs(trimNormalized.start * 1000), [trimNormalized.start]);
  const trimEndLabel = useMemo(() => formatDurationMs(trimNormalized.end * 1000), [trimNormalized.end]);
  const playheadLabel = useMemo(() => formatDurationMs(currentTime * 1000), [currentTime]);

  return (
    <div className="border-border bg-background mx-auto mt-4 flex w-full gap-4 rounded-2xl border p-2 shadow-sm">
      <div className="flex w-full items-center gap-3">
        <Button type="button" size="icon" variant="ghost" onClick={toggle}>
          <Icon name={isPlaying ? 'Pause' : 'Play'} className="h-4 w-4" />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative h-9 min-w-0 flex-1">
            <div
              ref={stripRef}
              className={cn('bg-background relative h-9 w-full rounded-lg border', !duration && 'opacity-60')}
              style={{ touchAction: 'none' }}
              onPointerDown={startPointerAction('scrub')}
              aria-label="Playback timeline">
              <div className="text-muted-foreground pointer-events-none absolute inset-x-0 flex h-full items-center justify-between px-4 text-[10px]">
                <span>0:00</span>
                <span>{durationLabel}</span>
              </div>

              <div
                className="absolute top-1/2 h-9 -translate-y-1/2 rounded-lg bg-yellow-400/20 ring-1 ring-yellow-400/60"
                style={{ left: `${trimStartPercentage}%`, width: `${trimWidthPercentage}%` }}
                // onPointerDown={enableTrim ? startPointerAction('trimWindow') : undefined}
              />

              <div
                className="absolute top-1/2 h-9 w-[2px] -translate-y-1/2 bg-yellow-500"
                style={{ left: `${playheadPercentage}%` }}
              />

              {showPlayheadTip && (
                <div
                  className="bg-background absolute -top-2 -translate-x-1/2 -translate-y-full rounded-lg border px-2 py-1 text-[11px] tabular-nums shadow-sm"
                  style={{ left: `${playheadPercentage}%` }}>
                  {playheadLabel}
                </div>
              )}

              {enableTrim && (
                <>
                  <div
                    className="absolute top-1/2 h-9 w-[10px] -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-lg bg-yellow-500"
                    style={{ left: `${trimStartPercentage}%` }}
                    onPointerDown={startPointerAction('trimStart')}
                    role="slider"
                    aria-label="Trim start"
                  />
                  {showTrimStartTip && (
                    <div
                      className="bg-background absolute -top-2 -translate-x-1/2 -translate-y-full rounded-lg border px-2 py-1 text-[11px] tabular-nums shadow-sm"
                      style={{ left: `${trimStartPercentage}%` }}>
                      {trimStartLabel}
                    </div>
                  )}

                  <div
                    className="absolute top-1/2 h-9 w-[10px] -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-lg bg-yellow-500"
                    style={{ left: `${trimEndPercentage}%` }}
                    onPointerDown={startPointerAction('trimEnd')}
                    role="slider"
                    aria-label="Trim end"
                  />
                  {showTrimEndTip && (
                    <div
                      className="bg-background absolute -top-2 -translate-x-1/2 -translate-y-full rounded-lg border px-2 py-1 text-[11px] tabular-nums shadow-sm"
                      style={{ left: `${trimEndPercentage}%` }}>
                      {trimEndLabel}
                    </div>
                  )}
                </>
              )}

              {visibleEvents.map(event => {
                const leftPercentage = ratioFromSeconds(event.videoSeconds, duration);
                const isHighlighted = event.uuid === highlightedEventId;

                const status = getNetworkStatus(event as NetworkRecord);
                const severity =
                  event.recordType === 'network' ? severityFromHttpStatus(status) : severityFromConsole(event);

                return (
                  <div
                    key={event.uuid}
                    className={cn(
                      'absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full transition',
                      {
                        'z-10 scale-150 ring-2 ring-green-400': isHighlighted,
                        'bg-destructive': severity === 'error',
                        'bg-amber-600': severity === 'warn',
                      },
                    )}
                    style={{ left: `${leftPercentage}%` }}
                    title={event.recordType}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {showEventsMenu && !!visibleEvents.length && (
          <EventsDropdown events={visibleEvents} onEventHover={setHighlightedEventId} />
        )}

        <div className="bg-border hidden h-[20px] w-[1px] sm:flex" />

        <ExportVideoButton disabled={disableExport} onClick={() => onExport('webm')} />
      </div>
    </div>
  );
};
