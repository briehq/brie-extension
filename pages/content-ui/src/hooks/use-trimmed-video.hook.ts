import { useCallback, useMemo, useRef, useState } from 'react';

import type { TrimRange, VideoFormat } from '@src/models';
import { trimBlobWithFfmpeg } from '@src/utils/recording';

interface Options {
  format?: VideoFormat;
  accurate?: boolean;
}

const mimeFor = (format: VideoFormat) => (format === 'mp4' ? 'video/mp4' : 'video/webm');

export const useVideoTrimmer = (sourceBlob: Blob) => {
  const [isTrimming, setIsTrimming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const jobIdRef = useRef(0);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsTrimming(false);
    setProgress(0);
  }, []);

  const trim = useCallback(
    async (range: TrimRange, opts: Options = {}) => {
      const format = (opts.format ?? 'webm') as VideoFormat;
      const accurate = opts.accurate ?? true;
      const mime = mimeFor(format);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const myJobId = ++jobIdRef.current;

      setLastError(null);
      setIsTrimming(true);
      setProgress(0);

      try {
        const out = await trimBlobWithFfmpeg(sourceBlob, range, {
          format,
          accurate,
          onProgress: r => {
            if (jobIdRef.current !== myJobId) return;
            setProgress(typeof r === 'number' ? r : 0);
          },
        });

        const typed = out.type ? out : new Blob([out], { type: mime });
        return typed.type === mime ? typed : new Blob([typed], { type: mime });
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setLastError(e?.message ?? 'Trim failed');
        }
        throw e;
      } finally {
        if (jobIdRef.current === myJobId) {
          setIsTrimming(false);
          abortRef.current = null;
        }
      }
    },
    [sourceBlob],
  );

  return useMemo(
    () => ({ trim, cancel, isTrimming, progress, lastError }),
    [trim, cancel, isTrimming, progress, lastError],
  );
};
