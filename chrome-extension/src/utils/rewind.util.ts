// rewind.service.ts
import type { Runtime } from 'webextension-polyfill';

import { REWIND, isRewindBlocked, sendMessageToTab } from '@extension/shared';

import { deleteTabAll, deleteBefore, getRange, putBatch } from '@src/services';

const WINDOW_DURATION_MS = 60_000;
const CLEANUP_CUSHION_MS = 10_000;

const FLUSH_INTERVAL_MS = 2_000; // best-effort only (MV3 timers unreliable)
const FLUSH_THRESHOLD_EVENTS = 1_000; // best-effort only

// rrweb event types
const RRWEB_FULL_SNAPSHOT_EVENT_TYPE = 2;
const RRWEB_META_EVENT_TYPE = 4;

const ANCHOR_LOOKBACK_MS = 10 * 60_000;
const ANCHOR_SCAN_CHUNK_MS = 30_000;

type FlushTimerHandle = ReturnType<typeof setTimeout>;

type PendingRewindEvent = {
  timestamp: number;
  payload: unknown;
};

// eslint-disable-next-line import-x/exports-last
export type FrozenRewindSnapshot = {
  fromTimestamp: number;
  toTimestamp: number;
  events: unknown[];
  missingAnchor?: boolean;
};

type StoredRewindRow = {
  tabId: number;
  timestamp: number;
  sequence: number;
  kind: 'rrweb';
  payload: unknown;
};

type AnchorCache = {
  lastMeta?: { timestamp: number; payload: unknown };
  lastFullSnapshot?: { timestamp: number; payload: unknown };
};

type TabRewindState = {
  generation: number;
  enabled: boolean;
  sequence: number;

  pendingEvents: PendingRewindEvent[];
  flushTimerHandle: FlushTimerHandle | null;
  flushInFlightPromise: Promise<void> | null;

  latestEventTimestampSeen: number | null;

  // in-memory anchor cache (diagnostic + fallback)
  anchors: AnchorCache;

  // logging guard
  hasLoggedMissingAnchors: boolean;

  frozenSnapshot: FrozenRewindSnapshot | null;
};

type BlockState = { blocked: boolean; reason?: string };

const tabStates = new Map<number, TabRewindState>();

const createTabState = (): TabRewindState => ({
  generation: 0,
  enabled: true,
  sequence: 0,

  pendingEvents: [],
  flushTimerHandle: null,
  flushInFlightPromise: null,

  latestEventTimestampSeen: null,

  anchors: {},
  hasLoggedMissingAnchors: false,

  frozenSnapshot: null,
});

const getTabRewindState = (tabId: number): TabRewindState => {
  const existingState = tabStates.get(tabId);
  if (existingState) return existingState;

  const createdState = createTabState();
  tabStates.set(tabId, createdState);
  return createdState;
};

const getBlockStateFromSender = (sender: Runtime.MessageSender): BlockState => {
  const tabUrl = sender?.tab?.url;
  if (typeof tabUrl !== 'string' || tabUrl.length === 0) return { blocked: false };

  try {
    return isRewindBlocked(tabUrl);
  } catch {
    return { blocked: false };
  }
};

const clearFlushTimer = (tabState: TabRewindState): void => {
  if (!tabState.flushTimerHandle) return;
  clearTimeout(tabState.flushTimerHandle);
  tabState.flushTimerHandle = null;
};

const scheduleFlushForTab = (tabId: number): void => {
  const tabState = getTabRewindState(tabId);
  if (tabState.flushTimerHandle) return;

  tabState.flushTimerHandle = setTimeout(() => {
    tabState.flushTimerHandle = null;
    void flushTabToStorage(tabId);
  }, FLUSH_INTERVAL_MS);
};

const sortRows = (rows: any[]): any[] =>
  rows.sort((a: any, b: any) => a.timestamp - b.timestamp || a.sequence - b.sequence);

const extractPayloads = (rows: any[]): unknown[] => rows.map((row: any) => row.payload);

const readEventsFromStorage = async (tabId: number, fromTimestamp: number, toTimestamp: number): Promise<unknown[]> => {
  const storedRows = await getRange(tabId, fromTimestamp, toTimestamp);
  return extractPayloads(sortRows(storedRows));
};

const getEventTimestamp = (payload: unknown): number => {
  const ts = (payload as any)?.timestamp;
  return typeof ts === 'number' && Number.isFinite(ts) ? ts : Date.now();
};

/**
 * rrweb versions and wrappers can differ. Be defensive:
 * - most: event.type is number
 * - sometimes payload could be wrapped: { event: {...} } (your own structure)
 * - sometimes: event.data?.type (rare but seen in pipelines)
 */
const getEventType = (payload: unknown): number | null => {
  const direct = (payload as any)?.type;
  if (typeof direct === 'number') return direct;

  const nestedEventType = (payload as any)?.event?.type;
  if (typeof nestedEventType === 'number') return nestedEventType;

  const dataType = (payload as any)?.data?.type;
  if (typeof dataType === 'number') return dataType;

  return null;
};

const isMeta = (payload: unknown): boolean => getEventType(payload) === RRWEB_META_EVENT_TYPE;
const isFullSnapshot = (payload: unknown): boolean => getEventType(payload) === RRWEB_FULL_SNAPSHOT_EVENT_TYPE;

const cloneWithTimestamp = (payload: unknown, timestamp: number): unknown => {
  if (payload && typeof payload === 'object') return { ...(payload as any), timestamp };
  return payload;
};

const findMaxTimestamp = (events: PendingRewindEvent[]): number | null => {
  if (events.length === 0) return null;
  let max = events[0]!.timestamp;
  for (const e of events) if (e.timestamp > max) max = e.timestamp;
  return max;
};

const updateLatestSeen = (tabState: TabRewindState, events: PendingRewindEvent[]): void => {
  const max = findMaxTimestamp(events);
  if (max === null) return;

  tabState.latestEventTimestampSeen =
    tabState.latestEventTimestampSeen === null ? max : Math.max(tabState.latestEventTimestampSeen, max);
};

const updateAnchorCacheFromPending = (tabState: TabRewindState, events: PendingRewindEvent[]): void => {
  for (const ev of events) {
    const payload = ev.payload;
    if (isMeta(payload)) tabState.anchors.lastMeta = { timestamp: ev.timestamp, payload };
    if (isFullSnapshot(payload)) tabState.anchors.lastFullSnapshot = { timestamp: ev.timestamp, payload };
  }
};

const mapPendingEventsToRows = (
  tabId: number,
  tabState: TabRewindState,
  events: PendingRewindEvent[],
): StoredRewindRow[] =>
  events.map(ev => ({
    tabId,
    timestamp: ev.timestamp,
    sequence: ++tabState.sequence,
    kind: 'rrweb',
    payload: ev.payload,
  }));

const pickStrictRetentionCutoff = (tabState: TabRewindState, fallbackNow: number): number => {
  const latest = tabState.latestEventTimestampSeen ?? fallbackNow;
  return latest - WINDOW_DURATION_MS - CLEANUP_CUSHION_MS;
};

/**
 * LOSSLESS flush: does not drop pending events if IDB write fails.
 * Coalesces concurrent flush calls via flushInFlightPromise.
 */
const flushTabToStorage = async (tabId: number): Promise<void> => {
  const tabState = getTabRewindState(tabId);
  if (tabState.flushInFlightPromise) return tabState.flushInFlightPromise;

  const flushGen = tabState.generation;

  const runFlush = async (): Promise<void> => {
    if (tabState.pendingEvents.length === 0) return;

    const pendingSnapshot = tabState.pendingEvents.slice();

    // update in-memory caches before attempting storage
    updateLatestSeen(tabState, pendingSnapshot);
    updateAnchorCacheFromPending(tabState, pendingSnapshot);

    const rows = mapPendingEventsToRows(tabId, tabState, pendingSnapshot);
    if (rows.length === 0) return;

    try {
      if (tabState.generation !== flushGen) return;

      await putBatch(rows);

      if (tabState.generation !== flushGen) return;

      // commit: drop what we wrote (keep newly queued)
      tabState.pendingEvents.splice(0, pendingSnapshot.length);

      // strict prune: NEVER pin by anchors (that was your >1min bug)
      const cutoff = pickStrictRetentionCutoff(tabState, Date.now());
      await deleteBefore(tabId, cutoff);
    } catch (err) {
      console.error('[brie|rewind] flush failed', err);

      // keep pending; cap memory if IDB is broken
      const MAX_PENDING_EVENTS = 20_000;
      if (tabState.pendingEvents.length > MAX_PENDING_EVENTS) {
        tabState.pendingEvents.splice(0, tabState.pendingEvents.length - MAX_PENDING_EVENTS);
      }
    }
  };

  tabState.flushInFlightPromise = runFlush().finally(() => {
    if (tabState.generation === flushGen) tabState.flushInFlightPromise = null;
  });

  return tabState.flushInFlightPromise;
};

const findLatestAnchorBefore = async (
  tabId: number,
  beforeTimestamp: number,
  rrwebTypeToFind: number,
): Promise<unknown | null> => {
  const searchStart = Math.max(0, beforeTimestamp - ANCHOR_LOOKBACK_MS);

  for (let to = beforeTimestamp; to > searchStart; to -= ANCHOR_SCAN_CHUNK_MS) {
    const from = Math.max(searchStart, to - ANCHOR_SCAN_CHUNK_MS);
    const chunk = await readEventsFromStorage(tabId, from, to);
    if (chunk.length === 0) continue;

    for (let i = chunk.length - 1; i >= 0; i -= 1) {
      const ev = chunk[i];
      if (getEventType(ev) === rrwebTypeToFind) return ev;
    }
  }

  return null;
};

const ensureAnchorsInReturnedWindow = async (
  tabId: number,
  tabState: TabRewindState,
  windowEvents: unknown[],
  fromTimestamp: number,
  toTimestamp: number,
): Promise<{ events: unknown[]; missingAnchor: boolean }> => {
  let hasMetaInWindow = false;
  let hasFullSnapshotInWindow = false;

  for (const ev of windowEvents) {
    const t = getEventType(ev);
    if (t === RRWEB_META_EVENT_TYPE) hasMetaInWindow = true;
    if (t === RRWEB_FULL_SNAPSHOT_EVENT_TYPE) hasFullSnapshotInWindow = true;
    if (hasMetaInWindow && hasFullSnapshotInWindow) break;
  }

  // Try storage lookback first (truth source), then in-memory cache.
  let meta: unknown | null = null;
  let full: unknown | null = null;

  if (!hasMetaInWindow) {
    meta = await findLatestAnchorBefore(tabId, fromTimestamp, RRWEB_META_EVENT_TYPE);
    if (!meta && tabState.anchors.lastMeta) meta = tabState.anchors.lastMeta.payload;
  }

  if (!hasFullSnapshotInWindow) {
    full = await findLatestAnchorBefore(tabId, fromTimestamp, RRWEB_FULL_SNAPSHOT_EVENT_TYPE);
    if (!full && tabState.anchors.lastFullSnapshot) full = tabState.anchors.lastFullSnapshot.payload;
  }

  const missingAnchor = !(hasMetaInWindow || meta) || !(hasFullSnapshotInWindow || full);

  // Inject missing anchors inside the 1-min range (strict requirement).
  // Put them at the start, in correct order: meta then full snapshot.
  const injected: unknown[] = [];

  if (!hasMetaInWindow && meta) {
    injected.push(cloneWithTimestamp(meta, fromTimestamp));
  }
  if (!hasFullSnapshotInWindow && full) {
    injected.push(cloneWithTimestamp(full, Math.min(toTimestamp, fromTimestamp + 1)));
  }

  const events = injected.length ? [...injected, ...windowEvents] : windowEvents;

  // One-time debug if anchors are still missing, so you can see whether rrweb is emitting them at all.
  if (missingAnchor && !tabState.hasLoggedMissingAnchors) {
    tabState.hasLoggedMissingAnchors = true;
    console.warn('[brie|rewind] missing anchors on freeze', {
      tabId,
      windowFrom: fromTimestamp,
      windowTo: toTimestamp,
      windowCount: windowEvents.length,
      hasMetaInWindow,
      hasFullSnapshotInWindow,
      hasMetaInMemory: Boolean(tabState.anchors.lastMeta),
      hasFullSnapshotInMemory: Boolean(tabState.anchors.lastFullSnapshot),
      lastMetaTs: tabState.anchors.lastMeta?.timestamp ?? null,
      lastFullSnapshotTs: tabState.anchors.lastFullSnapshot?.timestamp ?? null,
    });
  }

  return { events, missingAnchor };
};

const buildPlayableEventStream = async (
  tabId: number,
  fromTimestamp: number,
  toTimestamp: number,
): Promise<{ events: unknown[]; missingAnchor: boolean }> => {
  const tabState = getTabRewindState(tabId);
  const windowEvents = await readEventsFromStorage(tabId, fromTimestamp, toTimestamp);
  return ensureAnchorsInReturnedWindow(tabId, tabState, windowEvents, fromTimestamp, toTimestamp);
};

const ingestRewindEvents = async (tabId: number, events: unknown[]): Promise<void> => {
  const tabState = getTabRewindState(tabId);
  if (!tabState.enabled) return;

  for (const payload of events) {
    tabState.pendingEvents.push({
      timestamp: getEventTimestamp(payload),
      payload,
    });
  }

  if (tabState.pendingEvents.length >= FLUSH_THRESHOLD_EVENTS) {
    clearFlushTimer(tabState);
    await flushTabToStorage(tabId);
    return;
  }

  await flushTabToStorage(tabId);
  scheduleFlushForTab(tabId);
};

const freezeTabRewind = async (tabId: number): Promise<FrozenRewindSnapshot> => {
  const tabState = getTabRewindState(tabId);

  await flushTabToStorage(tabId);

  const toTimestamp = tabState.latestEventTimestampSeen ?? Date.now();
  const fromTimestamp = toTimestamp - WINDOW_DURATION_MS;

  const { events, missingAnchor } = await buildPlayableEventStream(tabId, fromTimestamp, toTimestamp);

  tabState.frozenSnapshot = { fromTimestamp, toTimestamp, events, missingAnchor };
  return tabState.frozenSnapshot;
};

const clearFrozenSnapshotOnly = (tabId: number): void => {
  getTabRewindState(tabId).frozenSnapshot = null;
};

const resetTabRewind = async (tabId: number): Promise<void> => {
  const tabState = getTabRewindState(tabId);

  tabState.generation += 1;

  clearFlushTimer(tabState);
  tabState.pendingEvents = [];
  tabState.frozenSnapshot = null;
  tabState.anchors = {};
  tabState.hasLoggedMissingAnchors = false;

  try {
    await tabState.flushInFlightPromise;
  } catch {
    // ignore
  } finally {
    tabState.flushInFlightPromise = null;
  }

  await deleteTabAll(tabId);

  tabState.sequence = 0;
  tabState.latestEventTimestampSeen = null;
};

export const rewindService = {
  setEnabled: async (tabId: number, enabled: boolean): Promise<void> => {
    const tabState = getTabRewindState(tabId);
    tabState.enabled = Boolean(enabled);

    if (!enabled) {
      await resetTabRewind(tabId);
    }
  },

  ingestBatch: async (events: unknown[], sender: Runtime.MessageSender): Promise<void> => {
    const tabId = sender.tab?.id;
    if (typeof tabId !== 'number') return;

    const blockState = getBlockStateFromSender(sender);
    if (blockState.blocked) return;

    await ingestRewindEvents(tabId, Array.isArray(events) ? events : []);
  },

  freeze: async (tabId: number): Promise<FrozenRewindSnapshot> => {
    return freezeTabRewind(tabId);
  },

  getFrozenOrFreeze: async (tabId: number): Promise<FrozenRewindSnapshot> => {
    const existing = getTabRewindState(tabId).frozenSnapshot;
    if (existing) return existing;
    return freezeTabRewind(tabId);
  },

  clearFrozenOnly: (tabId: number): void => {
    clearFrozenSnapshotOnly(tabId);
  },

  resetTab: async (tabId: number): Promise<void> => {
    await resetTabRewind(tabId);
    await sendMessageToTab(tabId, { action: REWIND.RESTART_CAPTURE });
  },

  deleteTab: async (tabId: number): Promise<void> => {
    await resetTabRewind(tabId);
    tabStates.delete(tabId);
  },
};
