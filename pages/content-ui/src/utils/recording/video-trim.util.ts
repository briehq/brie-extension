import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

import { getRuntimeURL } from '@extension/shared';

import type { TrimRange, VideoFormat } from '@src/models';

interface TrimOptions {
  format?: VideoFormat;
  accurate?: boolean;
  onLog?: (message: string) => void;
  onProgress?: (progress: number) => void;
}
interface LoadOptions {
  onLog?: (message: string) => void;
  onProgress?: (progress: number) => void;
}

const ffmpegDir = 'content-ui/ffmpeg';
let listenersAttached = false;

const fmt = (s: number) => s.toFixed(3);

const resolveFfmpegAssets = (ffmpegDir: string) => {
  const core = getRuntimeURL(`${ffmpegDir}/ffmpeg-core.js`);
  const wasm = getRuntimeURL(`${ffmpegDir}/ffmpeg-core.wasm`);
  const worker = getRuntimeURL(`${ffmpegDir}/ffmpeg-worker.js`);

  return { core, wasm, worker };
};

const attachFfmpegListeners = (ffmpeg: FFmpeg, options: LoadOptions) => {
  if (listenersAttached) return;

  listenersAttached = true;

  ffmpeg.on?.('log', ({ message }: any) => {
    options.onLog?.(String(message ?? ''));
  });

  ffmpeg.on?.('progress', ({ progress }: any) => {
    if (typeof progress === 'number') options.onProgress?.(progress);
  });
};

const loadFfmpeg = async (options: LoadOptions = {}) => {
  const ffmpeg = new FFmpeg();

  attachFfmpegListeners(ffmpeg, options);

  const { core, wasm, worker } = resolveFfmpegAssets(ffmpegDir);

  await ffmpeg.load({
    coreURL: await toBlobURL(core, 'text/javascript'),
    wasmURL: await toBlobURL(wasm, 'application/wasm'),
    classWorkerURL: await toBlobURL(worker, 'text/javascript'),
  });

  return ffmpeg;
};

export const trimBlobWithFfmpeg = async (input: Blob, trim: TrimRange, options: TrimOptions = {}) => {
  const { format = 'webm', accurate = false } = options;

  const ffmpeg = await loadFfmpeg(options);

  const start = Math.max(0, trim.start);
  const end = Math.max(start, trim.end);
  const duration = Math.max(0, end - start);

  if (duration <= 0.05) throw new Error('Trim range too small.');

  const jobId = Date.now();
  const inputExtension = input.type.includes('mp4') ? 'mp4' : 'webm';
  const inputName = `input-${jobId}.${inputExtension}`;
  const outName = `out-${jobId}.${format}`;
  const outMime = `video/${format}`;

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(input));

    const argsFastWebm = ['-ss', fmt(start), '-t', fmt(duration), '-i', inputName, '-map', '0', '-c', 'copy', outName];
    const argsAccurateWebm = [
      '-i',
      inputName,
      '-ss',
      fmt(start),
      '-t',
      fmt(duration),
      '-vf',
      'scale=1280:-2,format=yuv420p',
      '-threads',
      '1',
      '-c:v',
      'libvpx-vp9',
      '-b:v',
      '0',
      '-crf',
      '33',
      '-deadline',
      'realtime',
      '-cpu-used',
      '6',
      outName,
    ];
    const argsAccurateMp4 = [
      '-i',
      inputName,
      '-ss',
      fmt(start),
      '-t',
      fmt(duration),
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      outName,
    ];
    const argsFastMp4 = [
      '-ss',
      fmt(start),
      '-t',
      fmt(duration),
      '-i',
      inputName,
      '-vf',
      'scale=1280:-2:force_original_aspect_ratio=decrease',
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      '28',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      outName,
    ];

    const args = format === 'mp4' ? argsFastMp4 : accurate ? argsAccurateWebm : argsFastWebm;

    await ffmpeg.exec(args);

    const out = await ffmpeg.readFile(outName);

    if (!(out instanceof Uint8Array) || !out.byteLength) {
      throw new Error('FFmpeg produced empty output.');
    }

    return new Blob([out], { type: outMime });
  } finally {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outName);
    await ffmpeg.terminate();
  }
};
