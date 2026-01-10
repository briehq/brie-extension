export type CaptureMode = 'area' | 'viewport' | 'fullPage';
export type RecordArea = 'tab' | 'desktop';

export interface PopupState {
  captureMode: CaptureMode;
  recordArea: RecordArea;
  micEnabled: boolean;
  systemAudioEnabled: boolean;
  rewindEnabled: boolean;
  captureOpen: boolean;
  recordOpen: boolean;
}
