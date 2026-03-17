import type { ConsoleRecord, NetworkRecord, RecordLike } from '@extension/shared';

import type { TimelineEvent } from '@src/models';

type Severity = TimelineEvent['severity'];
type TimelineType = TimelineEvent['type'];

type MapOptions = {
  dedupe?: boolean;
  limit?: number;
};

const asNonEmptyString = (v: unknown): string | undefined => (typeof v === 'string' && v.trim().length ? v : undefined);

const pickFirstString = (args: unknown): string | undefined => {
  if (!Array.isArray(args)) return undefined;

  return asNonEmptyString(args.find(a => typeof a === 'string'));
};

const tryParseUrl = (url: unknown): URL | undefined => {
  const s = asNonEmptyString(url);
  if (!s) return undefined;

  try {
    return new URL(s);
  } catch {
    return undefined;
  }
};

const shortEndpoint = (url: unknown): string => {
  const parsedUrl = tryParseUrl(url);

  if (!parsedUrl) return asNonEmptyString(url) ?? 'unknown';

  return parsedUrl.pathname || '/';
};

const formatNetworkLabel = (record: NetworkRecord): string => {
  const method = record.method.toUpperCase();
  const status = getNetworkStatus(record);
  const endpoint = shortEndpoint(record.responseURL ?? record.url);
  const duration = record.durationMs;
  const durationPart = duration !== undefined ? ` (${Math.round(duration)}ms)` : '';
  const statusPart = status ? `${status} ` : '';

  return `${statusPart}${method} ${endpoint}${durationPart}`;
};

const getConsoleMessage = (record: ConsoleRecord): string | undefined => pickFirstString(record.args);

const formatConsoleLabel = (record: ConsoleRecord): string => {
  const message = getConsoleMessage(record) ?? '';
  const source = asNonEmptyString(record.source);
  const prefix = source ? `[${source}] ` : '';
  const oneLine = message.replace(/\s+/g, ' ').trim();
  const clipped = oneLine.length > 140 ? `${oneLine.slice(0, 140)}…` : oneLine;
  const url = record.url;
  const needsEndpointHint = clipped && !clipped.includes('http') && url;

  return needsEndpointHint
    ? `${prefix}${clipped} (${shortEndpoint(url)})`
    : `${prefix}${clipped || shortEndpoint(url)}`;
};

/**
 * De-dupe based on stable fingerprints, not labels.
 * This prevents false merges when labels change (duration, source prefix, etc).
 */
const dedupeTimelineEvents = (events: TimelineEvent[]): TimelineEvent[] => {
  const byKey = new Map<string, TimelineEvent>();

  for (const event of events) {
    const key = fingerprintTimelineEvent(event);

    const prev = byKey.get(key);

    if (!prev) {
      byKey.set(key, event);
      continue;
    }

    const winner = event.timestamp < prev.timestamp ? event : prev;

    const severity = mergeSeverity(prev.severity, event.severity);
    byKey.set(key, { ...winner, severity });
  }

  return Array.from(byKey.values()).sort((a, b) => a.timestamp - b.timestamp);
};

const mergeSeverity = (a?: Severity, b?: Severity): Severity => {
  if (a === 'error' || b === 'error') return 'error';

  if (a === 'warn' || b === 'warn') return 'warn';

  return undefined;
};

const fingerprintTimelineEvent = (e: TimelineEvent): string => {
  const base = e.label
    .replace(/\(\d+ms\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return `${e.type}:${e.severity ?? 'na'}:${base}`;
};

export const getNetworkStatus = (record: NetworkRecord): number | undefined => record?.statusCode ?? record?.status;

export const isNetworkRecord = (record: RecordLike): record is NetworkRecord => record.recordType === 'network';

export const isConsoleRecord = (record: RecordLike): record is ConsoleRecord => record.recordType === 'console';

export const severityFromConsole = (record: ConsoleRecord, message?: string): Severity => {
  const method = record.method.toLowerCase();

  if (method === 'error') return 'error';
  if (['warning', 'warn'].includes(method)) return 'warn';

  const m = (message ?? '').toLowerCase();

  if (m.startsWith('warning:')) return 'warn';

  return 'error';
};

export const severityFromHttpStatus = (status?: number): Severity => {
  if (!status) return undefined;

  if (status >= 500) return 'error';

  if (status >= 400) return 'warn';

  return undefined;
};

/**
 * Convert raw extension records (network + console) into normalized timeline events.
 * - Stable IDs (always string)
 * - Safe timestamps (drops records without a usable timestamp)
 * - Predictable labels
 * - Optional de-duping and limiting
 */
export const mapRecordsToTimelineEvents = (records: RecordLike[], options?: MapOptions): TimelineEvent[] => {
  const { dedupe = true, limit } = options ?? {};

  const mapped: TimelineEvent[] = [];

  for (const record of records) {
    const timestamp = record.timestamp;
    const id = record.uuid;

    if (!timestamp) continue;

    if (isNetworkRecord(record)) {
      const status = getNetworkStatus(record);

      mapped.push({
        id,
        timestamp,
        type: 'network',
        label: formatNetworkLabel(record),
        severity: severityFromHttpStatus(status) ?? 'warn',
      });

      continue;
    }

    if (isConsoleRecord(record)) {
      const message = getConsoleMessage(record);

      mapped.push({
        id,
        timestamp,
        type: 'console',
        label: formatConsoleLabel(record),
        severity: severityFromConsole(record, message),
      });
    }
  }

  mapped.sort((a, b) => a.timestamp - b.timestamp);

  const normalized = dedupe ? dedupeTimelineEvents(mapped) : mapped;

  return limit ? normalized.slice(-limit) : normalized;
};
