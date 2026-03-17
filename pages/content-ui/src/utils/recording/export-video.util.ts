import type { VideoExportOptions, VideoExportResult } from '@src/models';

import { trimBlobWithFfmpeg } from './video-trim.util';

export const exportRecordingVideo = async (
  input: Blob,
  durationSeconds: number,
  options: VideoExportOptions,
): Promise<VideoExportResult> => {
  const { format, trim } = options;
  const mime = `video/${format}`;
  const filenameBase = options.filenameBase ?? `recording-${Date.now()}`;
  const outName = `${filenameBase}.${format}`;

  const isFullRange = trim.start <= 0.001 && Math.abs(trim.end - durationSeconds / 1000) <= 0.001;
  const isWebm = input.type.includes('webm') || input.type === '';
  const canFastPath = isFullRange && format === 'webm' && isWebm;

  if (canFastPath) {
    const enforced = input.type.includes('webm') ? input : new Blob([input], { type: 'video/webm' });
    return {
      blob: enforced,
      file: new File([enforced], outName, { type: 'video/webm' }),
      meta: {
        format,
        mime: 'video/webm',
        start: 0,
        end: durationSeconds,
        duration: durationSeconds,
        sizeBytes: enforced.size,
      },
    };
  }

  const blob = await trimBlobWithFfmpeg(input, trim, {
    format,
    /**
     * @todo
     * investigate why accurate: true fails
     */
  });

  return {
    blob,
    file: new File([blob], outName, { type: blob.type || mime }),
    meta: {
      format,
      mime: blob.type || mime,
      start: trim.start,
      end: trim.end,
      duration: Math.max(0, trim.end - trim.start),
      sizeBytes: blob.size,
    },
  };
};
