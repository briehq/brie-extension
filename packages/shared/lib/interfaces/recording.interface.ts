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
  | { type: 'START_RECORDING'; tabId: number }
  | { type: 'PAUSE_RECORDING'; tabId: number }
  | { type: 'RESUME_RECORDING'; tabId: number }
  | { type: 'STOP_RECORDING'; tabId: number }
  | { type: 'TOGGLE_MIC'; tabId: number }
  | { type: 'GET_RECORDING_STATE'; tabId: number };

export type ContentToBgMessage =
  | { type: 'COUNTDOWN_FINISHED'; tabId: number }
  | { type: 'TOOLBAR_ACTION'; action: 'stop' | 'pause' | 'resume' | 'toggleMic'; tabId: number };

export type BgToContentMessage =
  | {
      type: 'RECORDING_STATE_CHANGED';
      state: RecordingState;
      hasAudio: boolean;
      startedAt?: number;
      totalPausedMs?: number;
    }
  | { type: 'RECORDING_COUNTDOWN'; secondsLeft: number }
  | { type: 'VIDEO_CAPTURED'; meta: VideoMeta };

export type BgToPopupMessage =
  | { type: 'RECORDING_STATE_CHANGED'; session: RecordingSession }
  | { type: 'VIDEO_CAPTURED'; meta: VideoMeta };

export interface Segment {
  startAt: number;
  endAt: number;
}
