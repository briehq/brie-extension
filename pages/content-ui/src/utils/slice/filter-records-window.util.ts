interface AnyRecord {
  recordType?: string;
  timestamp?: number;
  [key: string]: any;
}

interface TimeWindow {
  start: number;
  end: number;
}

interface NetworkFilterOptions {
  screenshotTimes?: number[];
  networkTimes?: number[];
  windowMs?: number;
}
/**
 * Builds a single time window from the first and last timestamps, expanded by ±windowMs.
 * - If only one timestamp, uses ±windowMs around that single point.
 * - If no timestamps, returns null.
 */
const buildWindowFromRange = (times: number[] | undefined, windowMs: number): TimeWindow | null => {
  if (!times || times.length === 0) return null;

  const sorted = [...times].sort((a, b) => a - b);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  return {
    start: first - windowMs,
    end: last + windowMs,
  };
};

/**
 * Checks if a timestamp falls inside at least one window.
 */
const isInAnyWindow = (ts: number, windows: TimeWindow[]): boolean => {
  for (const w of windows) {
    if (ts >= w.start && ts <= w.end) return true;
  }
  return false;
};

/**
 * Filters *network* records to only those within windows built from:
 * - first/last screenshot timestamps (±windowMs)
 * - first/last network timestamps (±windowMs)
 *
 * Non-network records are always kept.
 *
 * Use cases:
 * - ±30s around firstScreenshot–lastScreenshot
 * - ±30s around a single screenshot
 * - ±30s around firstNetwork–lastNetwork
 * - ±30s around a single network event
 */
export const filterRecordsByWindows = (records: AnyRecord[], opts: NetworkFilterOptions): AnyRecord[] => {
  const { screenshotTimes, networkTimes, windowMs = 30_000 } = opts;

  const windows: TimeWindow[] = [];

  const screenshotWindow = buildWindowFromRange(screenshotTimes, windowMs);
  if (screenshotWindow) windows.push(screenshotWindow);

  const networkWindow = buildWindowFromRange(networkTimes, windowMs);
  if (networkWindow) windows.push(networkWindow);

  if (!windows.length) return records;

  const kept: AnyRecord[] = [];

  for (const rec of records) {
    if (rec.recordType !== 'network') {
      kept.push(rec);
      continue;
    }

    if (!rec.timestamp) {
      continue;
    }

    if (isInAnyWindow(rec.timestamp, windows)) {
      kept.push(rec);
    }
  }

  return kept;
};
