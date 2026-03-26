export type CaptureMode = 'area' | 'viewport' | 'fullPage';
export type RecordArea = 'tab' | 'desktop';

export interface PopupState {
  captureMode: CaptureMode;
  recordArea: RecordArea;
  systemAudioEnabled: boolean;
  captureOpen: boolean;
  recordOpen: boolean;
}
