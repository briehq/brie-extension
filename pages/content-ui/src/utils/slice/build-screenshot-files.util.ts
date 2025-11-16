import type { Screenshot } from '@extension/shared';

import { buildScreenshotFile } from './build-screenshot-file.util';
import { limitConcurrency } from './limit-concurrency.util';

const MAX_IMAGE_CONCURRENCY = 3;

/**
 * Processes all screenshots with limited concurrency.
 * @param screenshots - Screenshots array.
 *
 * @returns Promise<File[]> - Valid files only (failed ones skipped).
 */
export const buildScreenshotsFiles = async (screenshots: Screenshot[]): Promise<File[]> => {
  if (!screenshots?.length) return [];

  const prepared = await limitConcurrency(screenshots, MAX_IMAGE_CONCURRENCY, async (shot, idx) => {
    try {
      return await buildScreenshotFile(shot, idx);
    } catch (e) {
      console.warn('[create] screenshot processing failed:', e);

      return null;
    }
  });

  return prepared.filter((f): f is File => f instanceof File);
};
