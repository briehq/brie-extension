import { fileNameOr } from './file-name.util';
import { getRecords } from './records.util';
import { createJsonFile } from '../create-json-file.util';

/**
 * Builds a JSON file with recorded events.
 * Always returns a file, even if empty.
 *
 * @returns Promise<File> - JSON file containing [] or actual records.
 */
export const buildRecordsFile = async (): Promise<File> => {
  const all = await getRecords().catch(() => []);
  const flattened = Array.isArray(all) ? all.flat() : [];

  return createJsonFile(flattened, fileNameOr('records.json', 0));
};
