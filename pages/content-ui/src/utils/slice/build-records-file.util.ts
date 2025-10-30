import { fileNameOr } from './file-name.util';
import { getRecords } from './records.util';
import { createJsonFile } from '../create-json-file.util';

/**
 * Builds a JSON file with recorded events.
 *
 * @returns Promise<File | undefined> - File if successful, otherwise undefined.
 */
export const buildRecordsFile = async (): Promise<File | undefined> => {
  const all = await getRecords().catch(() => []);
  const flattened = Array.isArray(all) ? all.flat() : [];

  if (flattened.length === 0) return undefined;

  const f = createJsonFile(flattened, fileNameOr('records.json', 0));

  return f ?? undefined;
};
