export type CaptureType = 'area' | 'viewport' | 'full-page';
export type CaptureState = 'idle' | 'capturing' | 'unsaved';

export type BgMessage =
  | { type: 'EXIT_CAPTURE' }
  | { type: 'ADD_RECORD'; data: unknown }
  | { type: 'GET_RECORDS' }
  | { type: 'DELETE_RECORDS' }
  | { type: 'AUTH_START' }
  | { action: 'checkNativeCapture' }
  | { action: 'captureVisibleTab' };

export type BgResponse =
  | { status: 'success' }
  | { records: unknown[] }
  | { success: boolean; dataUrl?: string; message?: string }
  | { ok: boolean; error?: string }
  | { isAvailable: boolean };
