/* eslint-disable jsx-a11y/role-has-required-aria-props */
import type { eventWithTime } from '@rrweb/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import rrwebPlayer from 'rrweb-player';

import type { NetworkRecord, RecordLike } from '@extension/shared';
import { cn, Button, Icon, Switch, Popover, PopoverContent, PopoverTrigger } from '@extension/ui';

import type { TrimRange } from '@src/models';
import { getNetworkStatus, severityFromConsole, severityFromHttpStatus } from '@src/utils';

import { EventsDropdown } from '../ui/events-dropdown.ui';

type RewindPlayerProps = {
  errorEvents?: RecordLike[];
  events: unknown[] | null;
  className?: string;
  defaultSkipInactivity?: boolean;
  defaultSpeed?: number;
  showEventsMenu?: boolean;
  enableTrim?: boolean;
  onTrimChange?: (range: TrimRange) => void;
};

type VisibleEvent = RecordLike & {
  uuid: string;
  recordType: string;
  absTs: number;
};

type PlayerInstance = any;

type RrwebEvent = eventWithTime & { type: number; timestamp: number };

const RRWEB_META_EVENT_TYPE = 4;
const RRWEB_FULL_SNAPSHOT_EVENT_TYPE = 2;

const getRecordAbsTs = (record: RecordLike): number | null => {
  const anyRec = record as any;

  // pick one that exists in your data; keep this strict
  const ts =
    (typeof anyRec.timestamp === 'number' && anyRec.timestamp) ||
    (typeof anyRec.time === 'number' && anyRec.time) ||
    (typeof anyRec.ts === 'number' && anyRec.ts) ||
    null;

  return typeof ts === 'number' && Number.isFinite(ts) ? ts : null;
};

const getRecordUuid = (record: RecordLike, fallback: string): string => {
  const anyRec = record as any;
  const id = anyRec.uuid ?? anyRec.id ?? anyRec._id;
  return typeof id === 'string' && id.length ? id : fallback;
};

const getRecordType = (record: RecordLike): string => {
  const anyRec = record as any;
  return String(anyRec.recordType ?? anyRec.type ?? 'event');
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const msToLabel = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const safeIsRrwebEvent = (candidate: unknown): candidate is RrwebEvent => {
  const anyCandidate = candidate as any;
  return (
    !!anyCandidate &&
    typeof anyCandidate === 'object' &&
    typeof anyCandidate.timestamp === 'number' &&
    Number.isFinite(anyCandidate.timestamp) &&
    typeof anyCandidate.type === 'number'
  );
};

// Tie-break ordering when timestamps are equal (meta -> full snapshot -> rest)
const sortByTime = (a: RrwebEvent, b: RrwebEvent) => {
  if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;

  const rank = (e: RrwebEvent) =>
    e.type === RRWEB_META_EVENT_TYPE ? 0 : e.type === RRWEB_FULL_SNAPSHOT_EVENT_TYPE ? 1 : 2;

  return rank(a) - rank(b);
};

const getStableSize = (element: HTMLElement): { width: number; height: number } | null => {
  const width = Math.floor(element.clientWidth);
  const height = Math.floor(element.clientHeight);
  if (width < 50 || height < 50) return null;
  return { width, height };
};

const findLastAnchorBeforeOrAt = (sortedEvents: RrwebEvent[], type: number, atTimestamp: number): RrwebEvent | null => {
  for (let index = sortedEvents.length - 1; index >= 0; index -= 1) {
    const event = sortedEvents[index]!;
    if (event.timestamp <= atTimestamp && event.type === type) return event;
  }
  return null;
};

const buildEventsToPlay = (allSortedEvents: RrwebEvent[], fromTimestamp: number, toTimestamp: number) => {
  const windowEvents = allSortedEvents.filter(e => e.timestamp >= fromTimestamp && e.timestamp <= toTimestamp);

  const hasMetaInWindow = windowEvents.some(e => e.type === RRWEB_META_EVENT_TYPE);
  const hasFullSnapshotInWindow = windowEvents.some(e => e.type === RRWEB_FULL_SNAPSHOT_EVENT_TYPE);

  const prefix: RrwebEvent[] = [];

  if (!hasMetaInWindow) {
    const meta = findLastAnchorBeforeOrAt(allSortedEvents, RRWEB_META_EVENT_TYPE, fromTimestamp);
    if (meta) prefix.push(meta);
  }

  if (!hasFullSnapshotInWindow) {
    const snapshot = findLastAnchorBeforeOrAt(allSortedEvents, RRWEB_FULL_SNAPSHOT_EVENT_TYPE, fromTimestamp);
    if (snapshot) prefix.push(snapshot);
  }

  const combined = [...prefix, ...windowEvents].sort(sortByTime);

  const missingMeta = !combined.some(e => e.type === RRWEB_META_EVENT_TYPE);
  const missingSnapshot = !combined.some(e => e.type === RRWEB_FULL_SNAPSHOT_EVENT_TYPE);

  return { eventsToPlay: combined, missingMeta, missingSnapshot, windowEventsCount: windowEvents.length };
};

const ratioFromMs = (ms: number, total: number) => (total ? clamp((ms / total) * 100, 0, 100) : 0);

const msFromPointerEvent = (strip: HTMLDivElement, event: PointerEvent, total: number) => {
  const rect = strip.getBoundingClientRect();
  const x = clamp(event.clientX - rect.left, 0, rect.width);
  const ratio = rect.width ? x / rect.width : 0;
  return ratio * total;
};

export const RewindPlayer = ({
  events,
  errorEvents = [],
  className,
  defaultSkipInactivity = true,
  defaultSpeed = 1,
  enableTrim = false,
  showEventsMenu = false,
  onTrimChange,
}: RewindPlayerProps) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<PlayerInstance | null>(null);

  const stripRef = useRef<HTMLDivElement | null>(null);
  const pointerModeRef = useRef<'scrub' | 'trimStart' | 'trimEnd' | null>(null);

  const isDraggingTrimRef = useRef(false);
  const dragPointerIdRef = useRef<number | null>(null);

  const [viewportSize, setViewportSize] = useState<{ width: number; height: number } | null>(null);

  const speedOptions = useMemo(() => [1, 2, 4, 8] as const, []);
  type SpeedOption = (typeof speedOptions)[number];

  const normalizeSpeed = (value: number): SpeedOption => {
    if (speedOptions.includes(value as SpeedOption)) return value as SpeedOption;
    return 1;
  };

  const [speed, setSpeed] = useState<SpeedOption>(() => normalizeSpeed(defaultSpeed));
  const [skipInactivity, setSkipInactivity] = useState<boolean>(defaultSkipInactivity);

  const [isPlaying, setIsPlaying] = useState(false);

  const [trimStartTs, setTrimStartTs] = useState<number | null>(null);
  const [trimEndTs, setTrimEndTs] = useState<number | null>(null);

  const [playheadAbsTs, setPlayheadAbsTs] = useState<number | null>(null);

  const [showPlayheadTip, setShowPlayheadTip] = useState(false);
  const [showTrimStartTip, setShowTrimStartTip] = useState(false);
  const [showTrimEndTip, setShowTrimEndTip] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsBadgeCount = 0;
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);

  // Refs to avoid stale closure bugs during pointermove
  const boundsRef = useRef<{ first: number; last: number } | null>(null);
  const trimStartRef = useRef<number>(0);
  const trimEndRef = useRef<number>(0);
  const playheadAbsRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);

  // Track replayer-time while playing (ms from base event)
  const playheadMsFromBaseRef = useRef<number>(0);
  const rafSyncRef = useRef<number>(0);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const normalizedEvents = useMemo<RrwebEvent[]>(() => {
    if (!Array.isArray(events)) return [];
    return events.filter(safeIsRrwebEvent).slice().sort(sortByTime);
  }, [events]);

  const hasAnyEvents = normalizedEvents.length > 0;

  const bounds = useMemo(() => {
    if (!hasAnyEvents) return null;
    const first = normalizedEvents[0]!.timestamp;
    const last = normalizedEvents[normalizedEvents.length - 1]!.timestamp;
    return { first, last };
  }, [hasAnyEvents, normalizedEvents]);

  useEffect(() => {
    boundsRef.current = bounds;
  }, [bounds]);

  useEffect(() => {
    if (!bounds) {
      setTrimStartTs(null);
      setTrimEndTs(null);
      setPlayheadAbsTs(null);
      setIsPlaying(false);
      playheadMsFromBaseRef.current = 0;
      return;
    }

    setTrimStartTs(bounds.first);
    setTrimEndTs(bounds.last);
    setPlayheadAbsTs(bounds.first);
    setIsPlaying(false);
    playheadMsFromBaseRef.current = 0;
  }, [bounds?.first, bounds?.last]);

  const effectiveTrimStartTs = trimStartTs ?? bounds?.first ?? 0;
  const effectiveTrimEndTs = trimEndTs ?? bounds?.last ?? 0;

  const visibleEvents = useMemo<VisibleEvent[]>(() => {
    if (!bounds) return [];
    if (!errorEvents?.length) return [];

    const fromTs = Math.min(effectiveTrimStartTs, effectiveTrimEndTs);
    const toTs = Math.max(effectiveTrimStartTs, effectiveTrimEndTs);

    const out: VisibleEvent[] = [];

    for (let i = 0; i < errorEvents.length; i++) {
      const r = errorEvents[i]!;
      const absTs = getRecordAbsTs(r);
      if (absTs == null) continue;

      // Only show markers that fall inside current trim window
      if (absTs < fromTs || absTs > toTs) continue;

      out.push({
        ...(r as any),
        absTs,
        uuid: getRecordUuid(r, `${getRecordType(r)}-${absTs}-${i}`),
        recordType: getRecordType(r),
      });
    }

    // Keep markers stable left-to-right
    out.sort((a, b) => a.absTs - b.absTs);

    return out;
  }, [bounds, errorEvents, effectiveTrimStartTs, effectiveTrimEndTs]);

  useEffect(() => {
    trimStartRef.current = effectiveTrimStartTs;
    trimEndRef.current = effectiveTrimEndTs;
  }, [effectiveTrimStartTs, effectiveTrimEndTs]);

  const effectivePlayheadAbsTs = useMemo(() => {
    if (!bounds) return 0;
    const base = playheadAbsTs ?? bounds.first;
    const minTs = Math.min(effectiveTrimStartTs, effectiveTrimEndTs);
    const maxTs = Math.max(effectiveTrimStartTs, effectiveTrimEndTs);
    return clamp(base, minTs, maxTs);
  }, [bounds, playheadAbsTs, effectiveTrimStartTs, effectiveTrimEndTs]);

  useEffect(() => {
    playheadAbsRef.current = effectivePlayheadAbsTs;
  }, [effectivePlayheadAbsTs]);

  const stripTotalMs = useMemo(() => {
    if (!bounds) return 0;
    return Math.max(0, bounds.last - bounds.first);
  }, [bounds]);

  const { eventsToPlay, missingMeta, missingSnapshot } = useMemo(() => {
    if (!hasAnyEvents) {
      return { eventsToPlay: [] as RrwebEvent[], missingMeta: true, missingSnapshot: true, windowEventsCount: 0 };
    }
    const fromTs = Math.min(effectiveTrimStartTs, effectiveTrimEndTs);
    const toTs = Math.max(effectiveTrimStartTs, effectiveTrimEndTs);
    return buildEventsToPlay(normalizedEvents, fromTs, toTs);
  }, [hasAnyEvents, normalizedEvents, effectiveTrimStartTs, effectiveTrimEndTs]);

  const isPlayable = useMemo(() => {
    if (eventsToPlay.length < 2) return false;
    if (missingMeta || missingSnapshot) return false;
    return true;
  }, [eventsToPlay.length, missingMeta, missingSnapshot]);

  const baseTs = useMemo(() => eventsToPlay[0]?.timestamp ?? 0, [eventsToPlay]);

  // Trim offsets in replayer-time (ms from base event timestamp)
  const trimStartMsFromBase = useMemo(() => {
    if (!eventsToPlay.length) return 0;
    return Math.max(0, effectiveTrimStartTs - baseTs);
  }, [eventsToPlay.length, effectiveTrimStartTs, baseTs]);

  const trimEndMsFromBase = useMemo(() => {
    if (!eventsToPlay.length) return 0;
    return Math.max(0, effectiveTrimEndTs - baseTs);
  }, [eventsToPlay.length, effectiveTrimEndTs, baseTs]);

  const maxPlayableMsFromBase = useMemo(() => Math.max(0, trimEndMsFromBase), [trimEndMsFromBase]);

  // expose trim
  useEffect(() => {
    if (!onTrimChange) return;
    if (!bounds) return;

    const fromTimestamp = Math.min(effectiveTrimStartTs, effectiveTrimEndTs);
    const toTimestamp = Math.max(effectiveTrimStartTs, effectiveTrimEndTs);

    onTrimChange({ start: fromTimestamp, end: toTimestamp });
  }, [onTrimChange, bounds, effectiveTrimStartTs, effectiveTrimEndTs]);

  const destroyPlayer = () => {
    // stop RAF sync
    if (rafSyncRef.current) cancelAnimationFrame(rafSyncRef.current);
    rafSyncRef.current = 0;

    const mount = mountRef.current;
    if (mount) mount.innerHTML = '';
    playerRef.current = null;
  };

  const getReplayer = () => {
    const player = playerRef.current;

    if (!player) return null;
    try {
      return typeof player.getReplayer === 'function' ? player.getReplayer() : null;
    } catch {
      return null;
    }
  };

  // Best-effort read of current replayer time (ms from base)
  const getReplayerCurrentTime = (): number | null => {
    const replayer = getReplayer();
    if (!replayer) return null;

    try {
      if (typeof replayer.getCurrentTime === 'function') {
        const t = replayer.getCurrentTime();

        console.log('getCurrentTime', t);

        if (typeof t === 'number' && Number.isFinite(t)) return t;
      }
    } catch {
      //
    }

    // fallback patterns (depends on rrweb build)
    try {
      const meta = typeof replayer.getMeta === 'function' ? replayer.getMeta() : null;
      const t = (meta as any)?.currentTime;
      console.log('meta', meta);
      if (typeof t === 'number' && Number.isFinite(t)) return t;
    } catch {
      //
    }

    return null;
  };

  const pauseHard = () => {
    try {
      playerRef.current?.pause?.();
    } catch {
      //
    }
    setIsPlaying(false);
  };

  const stopRafSync = () => {
    if (rafSyncRef.current) cancelAnimationFrame(rafSyncRef.current);
    rafSyncRef.current = 0;
  };

  const startRafSync = () => {
    stopRafSync();

    const tick = () => {
      if (!isPlayingRef.current) return;

      const currentMs = getReplayerCurrentTime();
      console.log('currentMs', currentMs);

      if (currentMs != null) {
        // Clamp inside trim window in ms-space
        const minMs = trimStartMsFromBase;
        const maxMs = maxPlayableMsFromBase;
        const clampedMs = clamp(currentMs, minMs, maxMs);
        playheadMsFromBaseRef.current = clampedMs;

        const absTs = baseTs + clampedMs;
        setPlayheadAbsTs(absTs);

        if (clampedMs >= maxMs) {
          pauseHard();
          stopRafSync();
          setPlayheadAbsTs(baseTs + maxMs);
          return;
        }
      }

      rafSyncRef.current = requestAnimationFrame(tick);
    };

    rafSyncRef.current = requestAnimationFrame(tick);
  };

  const playerGotoMs = (timeOffsetMs: number, pauseAfterSeek: boolean) => {
    const player = playerRef.current;
    if (!player || typeof player.goto !== 'function') return;

    // rrweb-player: goto(timeOffset, play?)
    // your code uses pauseAfterSeek semantics, so invert.
    const play = !pauseAfterSeek;

    try {
      player.goto(timeOffsetMs, play);
    } catch {
      //
    }
  };

  const gotoAbsTs = (absTs: number, pauseAfterSeek: boolean) => {
    const minTs = Math.min(effectiveTrimStartTs, effectiveTrimEndTs);
    const maxTs = Math.max(effectiveTrimStartTs, effectiveTrimEndTs);
    const clampedAbs = clamp(absTs, minTs, maxTs);

    // Update UI immediately
    setPlayheadAbsTs(clampedAbs);

    // Translate absTs -> ms from base
    const msFromBase = clamp(Math.max(0, clampedAbs - baseTs), 0, maxPlayableMsFromBase);
    playheadMsFromBaseRef.current = msFromBase;

    // IMPORTANT: use rrweb-player API, not replayer
    playerGotoMs(msFromBase, pauseAfterSeek);
  };

  const mountPlayer = (width: number, height: number) => {
    const mount = mountRef.current;
    if (!mount) return;

    destroyPlayer();

    playerRef.current = new rrwebPlayer({
      target: mount,
      props: {
        events: eventsToPlay as any[],
        width,
        height,
        autoPlay: false,
        showController: false,
        speed,
        speedOption: [...speedOptions],
        skipInactive: skipInactivity,
      },
    });

    // Hook finish so we can stop playhead sync even when skipInactive jumps
    try {
      const replayer = getReplayer();
      if (replayer?.on) {
        replayer.on('finish', () => {
          pauseHard();
          stopRafSync();
          setPlayheadAbsTs(baseTs + maxPlayableMsFromBase);
        });
      }
    } catch {
      //
    }

    // Ensure paused after mount + seek to current playhead
    pauseHard();
    gotoAbsTs(effectivePlayheadAbsTs, true);
  };

  // size observer
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const update = () => {
      const next = getStableSize(viewport);
      if (!next) return;
      setViewportSize(prev => {
        if (!prev) return next;
        if (prev.width === next.width && prev.height === next.height) return prev;
        return next;
      });
    };

    update();
    const observer = new ResizeObserver(() => update());
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  // Re-mount player on key changes, BUT NOT while trimming drag is active.
  useEffect(() => {
    if (!viewportSize) return;

    if (!isPlayable) {
      destroyPlayer();
      setIsPlaying(false);
      return;
    }

    if (isDraggingTrimRef.current) return;

    mountPlayer(viewportSize.width, viewportSize.height);

    return () => destroyPlayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    viewportSize?.width,
    viewportSize?.height,
    isPlayable,
    speed,
    skipInactivity,
    effectiveTrimStartTs,
    effectiveTrimEndTs,
    eventsToPlay.length,
    baseTs,
    trimStartMsFromBase,
    trimEndMsFromBase,
  ]);

  const togglePlayPause = () => {
    const player = playerRef.current;
    if (!player) return;

    try {
      if (isPlaying) {
        pauseHard();
        stopRafSync();
        gotoAbsTs(playheadAbsRef.current, true); // keep frame where it stopped
        return;
      }

      // Seek to CURRENT playhead (already clamped inside trim)
      gotoAbsTs(playheadAbsRef.current || effectivePlayheadAbsTs, true);

      player.play();
      setIsPlaying(true);
      startRafSync();
    } catch {
      //
    }
  };

  const startPointerAction = (mode: 'scrub' | 'trimStart' | 'trimEnd') => (reactEvent: React.PointerEvent) => {
    const strip = stripRef.current;
    const b = boundsRef.current;
    if (!strip || !b) return;
    if (!stripTotalMs) return;

    pointerModeRef.current = mode;

    isDraggingTrimRef.current = mode === 'trimStart' || mode === 'trimEnd';
    dragPointerIdRef.current = reactEvent.pointerId;

    try {
      strip.setPointerCapture(reactEvent.pointerId);
    } catch {
      //
    }

    setShowPlayheadTip(mode === 'scrub');
    setShowTrimStartTip(mode === 'trimStart');
    setShowTrimEndTip(mode === 'trimEnd');

    const handleMove = (event: PointerEvent) => {
      const stripEl = stripRef.current;
      const boundsNow = boundsRef.current;
      if (!stripEl || !boundsNow) return;

      const pointerMs = msFromPointerEvent(stripEl, event, stripTotalMs);
      const pointerAbsTs = boundsNow.first + pointerMs;

      const tStart = trimStartRef.current;
      const tEnd = trimEndRef.current;
      const pAbs = playheadAbsRef.current;

      if (pointerModeRef.current === 'scrub') {
        pauseHard();
        stopRafSync();

        const minTs = Math.min(tStart, tEnd);
        const maxTs = Math.max(tStart, tEnd);
        const clampedAbs = clamp(pointerAbsTs, minTs, maxTs);

        setPlayheadAbsTs(clampedAbs);
        gotoAbsTs(clampedAbs, true);
        return;
      }

      if (!enableTrim) return;

      if (pointerModeRef.current === 'trimStart') {
        pauseHard();
        stopRafSync();

        const nextStart = clamp(pointerAbsTs, boundsNow.first, tEnd);
        setTrimStartTs(nextStart);

        const minTs = Math.min(nextStart, tEnd);
        const maxTs = Math.max(nextStart, tEnd);
        const nextPlayheadAbs = clamp(pAbs, minTs, maxTs);
        setPlayheadAbsTs(nextPlayheadAbs);

        gotoAbsTs(nextPlayheadAbs, true);
        return;
      }

      if (pointerModeRef.current === 'trimEnd') {
        pauseHard();
        stopRafSync();

        const nextEnd = clamp(pointerAbsTs, tStart, boundsNow.last);
        setTrimEndTs(nextEnd);

        const minTs = Math.min(tStart, nextEnd);
        const maxTs = Math.max(tStart, nextEnd);
        const nextPlayheadAbs = clamp(pAbs, minTs, maxTs);
        setPlayheadAbsTs(nextPlayheadAbs);

        gotoAbsTs(nextPlayheadAbs, true);
      }
    };

    const handleUp = () => {
      pointerModeRef.current = null;
      setShowPlayheadTip(false);
      setShowTrimStartTip(false);
      setShowTrimEndTip(false);

      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);

      try {
        const stripEl = stripRef.current;
        const pid = dragPointerIdRef.current;
        if (stripEl && pid != null) stripEl.releasePointerCapture(pid);
      } catch {
        //
      }

      dragPointerIdRef.current = null;

      const wasTrimDrag = isDraggingTrimRef.current;
      isDraggingTrimRef.current = false;

      pauseHard();
      stopRafSync();

      if (wasTrimDrag && viewportSize && isPlayable) {
        mountPlayer(viewportSize.width, viewportSize.height);
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);

    handleMove(reactEvent.nativeEvent);
  };

  const isFromHandle = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    return !!el?.closest?.('[data-timeline-handle="true"]');
  };

  const onStripPointerDown = (e: React.PointerEvent) => {
    if (isFromHandle(e.target)) return;
    startPointerAction('scrub')(e);
  };

  // best-effort inactivity overlay (purely visual)
  const inactivityThresholdMs = 10_000;
  const inactivityGaps = useMemo(() => {
    if (!hasAnyEvents || stripTotalMs <= 0) return [];
    if (!bounds) return [];

    const evs = normalizedEvents;
    if (evs.length < 2) return [];

    const gaps: { startAbsTs: number; endAbsTs: number }[] = [];
    for (let i = 1; i < evs.length; i++) {
      const prev = evs[i - 1]!;
      const next = evs[i]!;
      const gap = next.timestamp - prev.timestamp;
      if (gap > inactivityThresholdMs) gaps.push({ startAbsTs: prev.timestamp, endAbsTs: next.timestamp });
    }
    return gaps;
  }, [hasAnyEvents, stripTotalMs, bounds, normalizedEvents]);

  const trimStartOffsetFromBounds = bounds ? Math.max(0, effectiveTrimStartTs - bounds.first) : 0;
  const trimEndOffsetFromBounds = bounds ? Math.max(0, effectiveTrimEndTs - bounds.first) : 0;
  const playheadOffsetFromBounds = bounds ? clamp(effectivePlayheadAbsTs - bounds.first, 0, stripTotalMs) : 0;

  const trimStartPercentage = ratioFromMs(trimStartOffsetFromBounds, stripTotalMs);
  const trimEndPercentage = ratioFromMs(trimEndOffsetFromBounds, stripTotalMs);
  const playheadPercentage = ratioFromMs(playheadOffsetFromBounds, stripTotalMs);

  const fullDurationLabel = msToLabel(stripTotalMs);

  // label is time within trim window (ABS time label, not "compressed" label)
  const playheadLabel = msToLabel(Math.max(0, effectivePlayheadAbsTs - effectiveTrimStartTs));

  return (
    <div className={cn('relative flex min-h-0 min-w-0 flex-1 flex-col', className)}>
      <div ref={viewportRef} className="relative min-h-0 flex-1">
        {!hasAnyEvents ? (
          <div className="p-3 text-sm text-gray-600">No replay data captured yet.</div>
        ) : !isPlayable ? (
          <div className="p-3 text-sm text-gray-600">
            <div className="font-medium text-gray-900">Replay not ready.</div>
            <div className="mt-1">
              {eventsToPlay.length < 2 && <div>Not enough events to play.</div>}
              {missingMeta && <div>Missing rrweb Meta (type 4).</div>}
              {missingSnapshot && <div>Missing rrweb FullSnapshot (type 2).</div>}
              <div className="mt-2 text-xs text-gray-500">
                If this keeps happening, you are not capturing meta/snapshot events (content script config issue).
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <div ref={mountRef} className="absolute inset-0" />
          </div>
        )}
      </div>

      <div className="border-border bg-background mx-auto mt-4 flex w-full gap-4 rounded-2xl border p-2 shadow-sm">
        <div className="flex w-full items-center gap-3">
          <Button type="button" size="icon" variant="ghost" onClick={togglePlayPause} disabled={!isPlayable}>
            <Icon name={isPlaying ? 'Pause' : 'Play'} className="h-4 w-4" />
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="relative h-9 min-w-0 flex-1">
              <div
                ref={stripRef}
                className={cn(
                  'bg-background group relative h-9 w-full rounded-lg border',
                  !stripTotalMs && 'opacity-60',
                )}
                style={{ touchAction: 'none' }}
                onPointerDown={onStripPointerDown}
                aria-label="Playback timeline">
                <div className="text-muted-foreground pointer-events-none absolute inset-x-0 flex h-full items-center justify-between px-4 text-[10px]">
                  <span>0:00</span>
                  <span>{fullDurationLabel}</span>
                </div>

                {visibleEvents.map(event => {
                  const leftPercentage = bounds ? ratioFromMs(event.absTs - bounds.first, stripTotalMs) : 0;

                  const isHighlighted = event.uuid === highlightedEventId;

                  const status = getNetworkStatus(event as unknown as NetworkRecord);
                  const severity =
                    event.recordType === 'network' ? severityFromHttpStatus(status) : severityFromConsole(event);

                  return (
                    <div
                      key={event.uuid}
                      className={cn(
                        'absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full transition',
                        'ring-1 ring-black/5',
                        {
                          'z-20 scale-150 ring-2 ring-green-400': isHighlighted,
                          'bg-destructive z-10': severity === 'error',
                          'z-10 bg-amber-600': severity === 'warn',
                          'z-10 bg-slate-400': severity !== 'error' && severity !== 'warn',
                        },
                      )}
                      style={{ left: `${leftPercentage}%` }}
                      title={event.recordType}
                      onMouseEnter={() => setHighlightedEventId(event.uuid)}
                      onMouseLeave={() => setHighlightedEventId(null)}
                    />
                  );
                })}

                {inactivityGaps.map((g, idx) => {
                  const startMs = bounds ? g.startAbsTs - bounds.first : 0;
                  const endMs = bounds ? g.endAbsTs - bounds.first : 0;
                  const left = ratioFromMs(startMs, stripTotalMs);
                  const right = ratioFromMs(endMs, stripTotalMs);
                  const width = Math.max(0, right - left);

                  return (
                    <div
                      key={idx}
                      className="pointer-events-none absolute top-1/2 h-9 -translate-y-1/2 rounded-md"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        background:
                          'linear-gradient(to right, rgba(250,204,21,0.05), rgba(250,204,21,0.30) 10%, rgba(250,204,21,0.30) 90%, rgba(250,204,21,0.05))',
                      }}
                      aria-hidden="true">
                      <span className="text-muted-foreground absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-[10px] backdrop-blur-sm group-hover:block">
                        Inactive
                      </span>
                    </div>
                  );
                })}

                <div
                  className="absolute top-1/2 h-9 -translate-y-1/2 rounded-lg bg-yellow-400/20 ring-1 ring-yellow-400/60"
                  style={{
                    left: `${Math.min(trimStartPercentage, trimEndPercentage)}%`,
                    width: `${Math.max(0, Math.abs(trimEndPercentage - trimStartPercentage))}%`,
                  }}
                />

                <div
                  className="absolute top-1/2 h-9 w-[2px] -translate-y-1/2 bg-yellow-500"
                  style={{ left: `${playheadPercentage}%` }}
                />

                {showPlayheadTip && (
                  <div
                    className="bg-background text-foreground absolute -top-2 -translate-x-1/2 -translate-y-full rounded-lg border px-2 py-1 text-[11px] tabular-nums shadow-sm"
                    style={{ left: `${playheadPercentage}%` }}>
                    {playheadLabel}
                  </div>
                )}

                {enableTrim && (
                  <>
                    <div
                      data-timeline-handle="true"
                      className="absolute top-1/2 h-9 w-[10px] -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-lg bg-yellow-500"
                      style={{ left: `${trimStartPercentage}%` }}
                      onPointerDown={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        startPointerAction('trimStart')(e);
                      }}
                      role="slider"
                      aria-label="Trim start"
                    />
                    {showTrimStartTip && (
                      <div
                        className="bg-background text-foreground absolute -top-2 -translate-x-1/2 -translate-y-full rounded-lg border px-2 py-1 text-[11px] tabular-nums shadow-sm"
                        style={{ left: `${trimStartPercentage}%` }}>
                        {bounds ? msToLabel(effectiveTrimStartTs - bounds.first) : '0:00'}
                      </div>
                    )}

                    <div
                      data-timeline-handle="true"
                      className="absolute top-1/2 h-9 w-[10px] -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-lg bg-yellow-500"
                      style={{ left: `${trimEndPercentage}%` }}
                      onPointerDown={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        startPointerAction('trimEnd')(e);
                      }}
                      role="slider"
                      aria-label="Trim end"
                    />
                    {showTrimEndTip && (
                      <div
                        className="bg-background text-foreground absolute -top-2 -translate-x-1/2 -translate-y-full rounded-lg border px-2 py-1 text-[11px] tabular-nums shadow-sm"
                        style={{ left: `${trimEndPercentage}%` }}>
                        {bounds ? msToLabel(effectiveTrimEndTs - bounds.first) : '0:00'}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-border hidden h-[20px] w-[1px] sm:flex" />

          <div className="hidden items-center space-x-2 sm:flex">
            <Popover onOpenChange={setSettingsOpen} open={settingsOpen}>
              <PopoverTrigger asChild>
                <div
                  className={cn(
                    'hover:bg-muted flex size-[35px] cursor-pointer items-center justify-center rounded-md transition',
                    'text-muted-foreground relative bg-transparent',
                    { 'border-[0.5px]': (events?.length ?? 0) > 0 },
                  )}>
                  <Icon name="Settings" className="h-4 w-4" />

                  {settingsBadgeCount > 0 && (
                    <span className="bg-primary text-primary-foreground absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-medium">
                      {settingsBadgeCount}
                    </span>
                  )}
                </div>
              </PopoverTrigger>

              <PopoverContent
                onOpenAutoFocus={e => e.preventDefault()}
                side="top"
                align="end"
                sideOffset={18}
                className="w-[380px]">
                <div className="grid gap-3">
                  <h4 className="font-medium leading-none">Playback settings</h4>

                  <div className="grid gap-3 rounded-lg">
                    <div className="flex items-center justify-between gap-3">
                      <div className="grid gap-0.5">
                        <span className="text-sm font-medium">Skip inactivity</span>
                        <span className="text-muted-foreground text-xs">Fast-forward long gaps between events.</span>
                      </div>
                      <Switch
                        checked={skipInactivity}
                        onCheckedChange={setSkipInactivity}
                        aria-label="Skip inactivity"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <div className="grid gap-0.5">
                        <span className="text-sm font-medium">Speed</span>
                        <span className="text-muted-foreground text-xs">Playback rate.</span>
                      </div>
                      <select
                        className="bg-background h-9 rounded-lg border px-2 text-sm"
                        value={String(speed)}
                        onChange={e => setSpeed(normalizeSpeed(Number(e.target.value)))}
                        aria-label="Playback speed">
                        {speedOptions.map(option => (
                          <option key={option} value={String(option)}>
                            {option}x
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {showEventsMenu && !!visibleEvents.length && (
            <EventsDropdown events={visibleEvents} onEventHover={setHighlightedEventId} />
          )}
        </div>
      </div>
    </div>
  );
};
