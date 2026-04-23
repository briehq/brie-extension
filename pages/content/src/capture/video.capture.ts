import type { Segment } from '@extension/shared';
import { RECORDING, UI, VIDEO } from '@extension/shared';
import { captureStateStorage, recordingSettingsStorage } from '@extension/storage';
import type { VideoRecordingState } from '@extension/storage';

import type { CaptureOptions } from '@src/interfaces';

const MAX_RECORDED_MS = 5 * 60 * 1000;

let recordingState: VideoRecordingState = 'idle';
let stream: MediaStream | null = null;
let recorder: MediaRecorder | null = null;
let chunks: BlobPart[] = [];
let micStream: MediaStream | null = null;
let micAudioTrack: MediaStreamTrack | null = null;
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

const buildDisplayMediaConstraints = (captureType: CaptureOptions['captureType']): MediaStreamConstraints => {
  const isDesktop = captureType === 'desktop';

  return {
    preferCurrentTab: !isDesktop,
    audio: false,
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

const cleanupMic = async () => {
  if (micStream) {
    micStream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch {
        /* */
      }
    });
  }
  micStream = null;
  micAudioTrack = null;
  await Promise.all([
    recordingSettingsStorage.setMicActiveTrack(false),
    recordingSettingsStorage.setMicMuted(false),
  ]).catch(() => {
    /* storage write failure is non-critical */
  });
};

export const beginPreparingRecording = (options?: CaptureOptions) => {
  if (!['idle', 'error', 'unsaved'].includes(recordingState)) return;

  window.dispatchEvent(new CustomEvent(UI.LAYOUT_RECALC));

  pendingOptions = options ?? { captureType: 'tab' };
  chunks = [];
  segments = [];
  activeSegmentStartAt = null;

  setState('preparing');
};

export const startCaptureNow = async () => {
  if (recordingState !== 'preparing') return;

  try {
    const { mic } = await recordingSettingsStorage.getSettings();
    const wantMic = !!mic.enabled && mic.permission === 'granted';

    const captureType = pendingOptions?.captureType ?? 'tab';
    const captureOptions = { captureType, hasMic: wantMic };
    const constraints = buildDisplayMediaConstraints(captureType);
    const mimeOptions = pickMimeType();

    window.dispatchEvent(
      new CustomEvent(VIDEO.METADATA, {
        detail: {
          action: 'START',
          startedAt: segments[0]?.startAt ?? Date.now(),
          options: captureOptions,
        },
      }),
    );

    stream = await navigator.mediaDevices.getDisplayMedia(constraints);

    // Remove any unexpected audio tracks from the display stream
    stream.getAudioTracks().forEach(t => t.stop());

    let recordingStream = stream;

    if (wantMic) {
      try {
        // No timeout — the browser may show a per-page permission prompt that
        // the user needs time to respond to. The extension permission page only
        // grants mic for the chrome-extension:// origin; each web page origin
        // may prompt separately on first use.
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micAudioTrack = micStream.getAudioTracks()[0] ?? null;

        if (micAudioTrack) {
          recordingStream = new MediaStream([...stream.getVideoTracks(), micAudioTrack]);
          await recordingSettingsStorage.setMicActiveTrack(true);
          await recordingSettingsStorage.setMicMuted(false);
        } else {
          // getUserMedia succeeded but returned no audio tracks — treat as failure
          micStream.getTracks().forEach(t => t.stop());
          micStream = null;
          await recordingSettingsStorage.setMicActiveTrack(false);
          window.dispatchEvent(new CustomEvent(RECORDING.MIC_FALLBACK));
        }
      } catch (err) {
        console.warn('[brie | Recording] Mic unavailable, recording without audio:', err);
        // Don't set permission to 'denied' — the failure is page-origin-specific
        // (the user may have denied mic on this particular site but the extension
        // permission is still granted). Only the permission page should set 'denied'.
        await recordingSettingsStorage.setMicActiveTrack(false);
        micStream = null;
        micAudioTrack = null;
        window.dispatchEvent(new CustomEvent(RECORDING.MIC_FALLBACK));
      }
    }

    recorder = new MediaRecorder(recordingStream, mimeOptions);
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
        const videoMetadata = { durationMs, startedAt, endedAt, segments: segments.slice(), options: captureOptions };
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

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.addEventListener('ended', () => {
        cleanupMic();
        stopRecording();
      });
    }

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

export const toggleMic = async () => {
  if (!micAudioTrack) return;
  micAudioTrack.enabled = !micAudioTrack.enabled;
  await recordingSettingsStorage.setMicMuted(!micAudioTrack.enabled);
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
  cleanupMic();
  pendingOptions = null;
  activeSegmentStartAt = null;
  chunks = [];
  segments = [];
};
