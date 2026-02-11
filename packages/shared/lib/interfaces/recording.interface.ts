import type { RECORDING, VIDEO } from '../constants/messages/index.js';

export interface RecordingSession {
  state: RecordingState;
  tabId: number;
  hasAudio: boolean;
  startedAt?: number;
  pausedAt?: number;
  totalPausedMs: number;
  error?: string;
}

export interface VideoMeta {
  tabId: number;
  durationMs: number;
  hasAudio: boolean;
  startedAt: number;
  stoppedAt: number;
  mimeType: string;
}

export type PopupToBgMessage =
  | { type: typeof RECORDING.START; tabId: number }
  | { type: typeof RECORDING.PAUSE; tabId: number }
  | { type: typeof RECORDING.RESUME; tabId: number }
  | { type: typeof RECORDING.STOP; tabId: number }
  | { type: typeof RECORDING.TOGGLE_MIC; tabId: number }
  | { type: typeof RECORDING.STATE_CHANGED; tabId: number };

export type ContentToBgMessage =
  | { type: typeof RECORDING.COUNTDOWN_FINISHED; tabId: number }
  | { type: typeof RECORDING.TOOLBAR_ACTION; action: 'stop' | 'pause' | 'resume' | 'toggleMic'; tabId: number };

export type BgToContentMessage =
  | {
      type: typeof RECORDING.STATE_CHANGED;
      state: RecordingState;
      hasAudio: boolean;
      startedAt?: number;
      totalPausedMs?: number;
    }
  | { type: typeof RECORDING.COUNTDOWN; secondsLeft: number }
  | { type: typeof VIDEO.CAPTURED; meta: VideoMeta };

export type BgToPopupMessage =
  | { type: typeof RECORDING.STATE_CHANGED; session: RecordingSession }
  | { type: typeof VIDEO.CAPTURED; meta: VideoMeta };

export interface Segment {
  startAt: number;
  endAt: number;
}
