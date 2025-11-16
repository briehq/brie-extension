import { MAX_FILE_SIZE } from '@src/constants';

import { fileNameOr } from './file-name.util';
import { filterRecordsByWindows } from './filter-records-window.util';
import { getRecords } from './records.util';
import { createJsonFile } from '../create-json-file.util';

const estimateJsonSizeBytes = (data: unknown): number => {
  try {
    const json = JSON.stringify(data);
    return new TextEncoder().encode(json).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
};

/**
 * Builds a JSON file with recorded events.
 * Always returns a file, even when there are no records.
 *
 * When `trim` is true, it keeps only records around:
 *  - first/last screenshot timestamps (± window)
 *  - first/last failing network timestamps (± window)
 *
 * @param trim - Whether to trim network records by time windows.
 *
 * @returns JSON File containing [] or filtered records.
 */
export const buildRecordsFile = async (trim: boolean = false): Promise<File> => {
  const records = await getRecords().catch(() => []);
  const normalizedRecords = Array.isArray(records) ? records.flat() : [];
  const baseName = fileNameOr('records.json', 0);

  if (!normalizedRecords.length) {
    return createJsonFile([], baseName);
  }

  const estimatedSize = estimateJsonSizeBytes(normalizedRecords);

  if (estimatedSize <= MAX_FILE_SIZE) {
    return createJsonFile(normalizedRecords, baseName);
  }

  const screenshotTimes = normalizedRecords
    .filter(record => record.domain === 'screenshot')
    .map(record => record.timestamp);
  const failedNetworkTimes = normalizedRecords
    .filter(record => record.recordType === 'network' && (record?.status || record?.statusCode) >= 400)
    .map(record => record.timestamp);

  if (!screenshotTimes.length && !failedNetworkTimes.length) {
    return createJsonFile(normalizedRecords, baseName);
  }

  const trimmed = filterRecordsByWindows(normalizedRecords, {
    screenshotTimes,
    networkTimes: failedNetworkTimes,
    windowMs: 30_000,
  });

  return createJsonFile(trimmed, baseName);
};
