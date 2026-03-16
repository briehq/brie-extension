import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ConsoleRecord, NetworkRecord, RecordLike } from '@extension/shared';

import { getNetworkStatus, isConsoleRecord, isNetworkRecord } from '@src/utils';
import { getNormalizedRecords } from '@src/utils/slice';

interface UseErrorEventsResult {
  events: RecordLike[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const isNetworkError = (record: NetworkRecord) => {
  const status = getNetworkStatus(record);
  return typeof status === 'number' && status >= 400;
};

const isConsoleError = (record: ConsoleRecord) => String(record.method ?? '').toLowerCase() === 'error';

export const useErrorEvents = (): UseErrorEventsResult => {
  const [records, setRecords] = useState<RecordLike[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const runId = ++runIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const next = await getNormalizedRecords();

      if (!mountedRef.current || runId !== runIdRef.current) return;

      setRecords(Array.isArray(next) ? next : []);
    } catch (e: unknown) {
      if (!mountedRef.current || runId !== runIdRef.current) return;

      setRecords([]);
      setError(e instanceof Error ? e.message : 'Failed to load records');
    } finally {
      if (!mountedRef.current || runId !== runIdRef.current) {
        // eslint-disable-next-line no-unsafe-finally
        return;
      }
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const events = useMemo(() => {
    const out: RecordLike[] = [];

    for (const record of records) {
      if (isConsoleRecord(record)) {
        if (isConsoleError(record)) out.push(record);
        continue;
      }

      if (isNetworkRecord(record)) {
        if (isNetworkError(record)) out.push(record);
      }
    }

    return out;
  }, [records]);

  return { events, isLoading, error, refresh };
};
