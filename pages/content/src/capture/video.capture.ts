import type { Segment } from '@extension/shared';
import { UI, VIDEO } from '@extension/shared';
import { captureStateStorage, recordingSettingsStorage } from '@extension/storage';
import type { VideoRecordingState } from '@extension/storage';

import type { CaptureOptions } from '@src/interfaces';

const MAX_RECORDED_MS = 5 * 60 * 1000;

let recordingState: VideoRecordingState = 'idle';
let stream: MediaStream | null = null;
let recorder: MediaRecorder | null = null;
let chunks: BlobPart[] = [];
let audioTrack: MediaStreamTrack | null = null;
let pendingOptions: CaptureOptions | null = null;
let segments: Segment[] = [];
let activeSegmentStartAt: number | null = null;
let autoStopInterval: number | null = null;

const sumSegmentsMs = (segments: Segment[]) => segments.reduce((acc, s) => acc + Math.max(0, s.endAt - s.startAt), 0);

const getRecordedMs = () => {
  const recordedMs = sumSegmentsMs(segments);

  if (recordingState === 'capturing' && activeSegmentStartAt != null) {
    return recordedMs + Math.max(0, Date.now() - activeSegmentStartAt);
  }

  return recordedMs;
};

const openSegment = () => {
  if (activeSegmentStartAt != null) return;

  activeSegmentStartAt = Date.now();
};

const closeSegment = (endAt = Date.now()) => {
  if (activeSegmentStartAt == null) return;

  const startAt = activeSegmentStartAt;
  activeSegmentStartAt = null;

  if (!Number.isFinite(startAt) || !Number.isFinite(endAt)) return;

  segments.push({ startAt, endAt: Math.max(endAt, startAt) });
};

const setState = (next: VideoRecordingState) => {
  recordingState = next;
  captureStateStorage.setVideoState(next);
};

const clearAutoStop = () => {
  if (autoStopInterval != null) {
    clearInterval(autoStopInterval);
    autoStopInterval = null;
  }
};

const startAutoStop = () => {
  clearAutoStop();

  autoStopInterval = window.setInterval(() => {
    const recorded = getRecordedMs();

    if (recorded >= MAX_RECORDED_MS) {
      console.warn('[brie | Recording] Auto-stop: max recorded duration reached');
      stopRecording();
    }
  }, 500);
};

const buildDisplayMediaConstraints = (options: CaptureOptions): MediaStreamConstraints => {
  const isDesktop = options.captureType === 'desktop';
  const enableAudio = options.audio;

  return {
    preferCurrentTab: !isDesktop,
    audio: enableAudio,
    video: {
      displaySurface: isDesktop ? 'monitor' : 'browser',
    },
  };
};

const pickMimeType = (): MediaRecorderOptions => {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];

  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return { mimeType: mime };
  }

  return {};
};

export const beginPreparingRecording = (options?: CaptureOptions) => {
  if (!['idle', 'error', 'unsaved'].includes(recordingState)) return;

  window.dispatchEvent(new CustomEvent(UI.LAYOUT_RECALC));

  pendingOptions = options ?? { audio: false };
  chunks = [];
  segments = [];
  activeSegmentStartAt = null;

  setState('preparing');
};

export const startCaptureNow = async () => {
  if (recordingState !== 'preparing') return;

  try {
    const { mic } = await recordingSettingsStorage.getSettings();
    const enableAudio = !!mic.enabled && mic.permission === 'granted';

    const options: CaptureOptions = {
      captureType: pendingOptions?.captureType ?? 'tab',
      audio: enableAudio,
    };

    const constraints = buildDisplayMediaConstraints(options);
    const mimeOptions = pickMimeType();

    window.dispatchEvent(
      new CustomEvent(VIDEO.METADATA, {
        detail: {
          action: 'START',
          startedAt: segments[0]?.startAt ?? Date.now(),
          options: options ?? {},
        },
      }),
    );

    stream = await navigator.mediaDevices.getDisplayMedia(constraints);
    audioTrack = stream.getAudioTracks()[0] ?? null;

    if (!enableAudio && audioTrack) audioTrack.enabled = false;

    recorder = new MediaRecorder(stream, mimeOptions);
    chunks = [];

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };

    recorder.onstop = () => {
      try {
        closeSegment();

        const startedAt = segments[0]?.startAt ?? Date.now();
        const endedAt = segments.length ? segments[segments.length - 1]!.endAt : startedAt;
        const durationMs = getRecordedMs();

        const blob = new Blob(chunks, { type: recorder?.mimeType ?? 'video/webm' });
        const videoMetadata = { durationMs, startedAt, endedAt, segments: segments.slice(), options: options ?? {} };
        const event = new CustomEvent(VIDEO.CAPTURED, {
          detail: {
            blob,
            ...videoMetadata,
          },
        });

        window.dispatchEvent(event);
        window.dispatchEvent(
          new CustomEvent(VIDEO.METADATA, {
            detail: {
              action: 'STOP',
              ...videoMetadata,
            },
          }),
        );
      } catch (err) {
        console.error('[brie | Recording] Blob creation failed:', err);
      } finally {
        cleanup();
        setState('unsaved');
      }
    };

    recorder.onerror = (ev: any) => {
      console.error('[brie | Recording] MediaRecorder error:', ev?.error ?? ev);
      cleanup();
      setState('error');
    };

    segments = [];
    activeSegmentStartAt = null;
    openSegment();

    recorder.start(1000);
    setState('capturing');

    startAutoStop();
  } catch (e) {
    console.error('[brie | Recording] startCaptureNow failed:', e);
    cleanup();
    setState('error');
  }
};

export const pauseRecording = () => {
  if (recordingState !== 'capturing' || !recorder) return;

  try {
    recorder.pause();
    closeSegment();
    setState('paused');

    window.dispatchEvent(
      new CustomEvent(VIDEO.METADATA, {
        detail: {
          action: 'PAUSE',
        },
      }),
    );

    /**
     * @todo
     * keep autoStop interval running or not? pause shouldn't consume budget anyway,
     * but interval checks recordedMs so it's safe to keep running.
     */
  } catch (e) {
    console.error('[brie | Recording] pause failed:', e);
    cleanup();
    setState('error');
  }
};

export const resumeRecording = () => {
  if (recordingState !== 'paused' || !recorder) return;

  try {
    recorder.resume();
    openSegment();
    setState('capturing');

    window.dispatchEvent(
      new CustomEvent(VIDEO.METADATA, {
        detail: {
          action: 'RESUME',
        },
      }),
    );
  } catch (e) {
    console.error('[brie | Recording] resume failed:', e);
    cleanup();
    setState('error');
  }
};

export const stopRecording = () => {
  setState('unsaved');
  if (!recorder) return;

  try {
    clearAutoStop();
    closeSegment();
    recorder.stop();
  } catch (e) {
    console.error('[brie | Recording] stop failed:', e);
    cleanup();
    setState('error');
  }
};

export const toggleMic = () => {
  if (!audioTrack) return;
  audioTrack.enabled = !audioTrack.enabled;
};

export const cleanup = () => {
  clearAutoStop();

  try {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  } catch {
    //
  }

  recorder = null;

  if (stream) {
    stream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch {
        //
      }
    });
  }

  stream = null;
  audioTrack = null;
  pendingOptions = null;
  activeSegmentStartAt = null;
  chunks = [];
  segments = [];
};
