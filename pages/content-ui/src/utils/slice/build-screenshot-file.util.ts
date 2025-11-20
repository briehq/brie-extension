import type { Screenshot } from '@extension/shared';
import { annotationsStorage } from '@extension/storage';

import { mergeScreenshot } from '../annotation';
import { base64ToFile } from '../base64-to-file.util';

/**
 * Converts a screenshot into a file, merging annotations when available.
 *
 * @param screenshot - The screenshot object.
 * @param idx - Index for ordering.
 *
 * @returns Promise<File | null> - File if built, otherwise null.
 */
export const buildScreenshotFile = async (screenshot: Screenshot, idx: number): Promise<File | null> => {
  const annotations = (await annotationsStorage.getAnnotations(screenshot.id!)) ?? { objects: [], meta: {} as any };
  const { objects, meta } = annotations;

  const naturalHeight = meta?.sizes?.natural?.height;
  const naturalWidth = meta?.sizes?.natural?.width;

  if (!naturalHeight || !naturalWidth || !objects?.length) {
    return base64ToFile(screenshot.src, screenshot.name ?? `screenshot-${idx}`);
  }

  return mergeScreenshot({
    screenshot,
    objects,
    parentHeight: naturalHeight,
    parentWidth: naturalWidth,
  });
};
