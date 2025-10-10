import type { Screenshot } from '@extension/shared';
import { annotationsStorage } from '@extension/storage';

import { createJsonFile } from '../create-json-file.util';

export const createAnnotationsJsonFile = async (screenshots: Screenshot[]): Promise<File> => {
  const annotationsById: Record<string, any[]> = {};

  for (const shot of screenshots) {
    const annotations = await annotationsStorage.getAnnotations(shot.id!);

    annotationsById[shot.id!] = annotations?.objects ?? [];
  }

  return createJsonFile(annotationsById, 'annotations.json');
};
