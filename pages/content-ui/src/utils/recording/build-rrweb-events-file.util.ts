import type { eventWithTime } from '@rrweb/types';

import type { TrimRange } from '@src/models';

import {
  RRWEB_FULL_SNAPSHOT_EVENT_TYPE,
  RRWEB_META_EVENT_TYPE,
  safeIsRrwebEvent,
  sortByTime,
  trimRrwebEvents,
} from './rrweb-events-trim.util';

export const buildEventsFile = async ({ events, range }: { range?: TrimRange | null; events: eventWithTime[] }) => {
  const { trimmedEvents, fromTimestamp, toTimestamp } = trimRrwebEvents(events, range ?? null);

  // IMPORTANT: still validate you have anchors
  // (optional but you should log this because your dashboard playback depends on it)
  const hasMeta = trimmedEvents.some(e => e.type === RRWEB_META_EVENT_TYPE);
  const hasFullSnapshot = trimmedEvents.some(e => e.type === RRWEB_FULL_SNAPSHOT_EVENT_TYPE);

  const payload = {
    schemaVersion: 1,
    trim: range ? { fromTimestamp, toTimestamp } : null,
    events: range ? trimmedEvents : events.filter(safeIsRrwebEvent).slice().sort(sortByTime),
    diagnostics: range
      ? {
          originalCount: Array.isArray(events) ? events.length : 0,
          trimmedCount: trimmedEvents.length,
          hasMeta,
          hasFullSnapshot,
        }
      : null,
  };

  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  return new File([blob], 'events.json', { type: 'application/json' });
};
