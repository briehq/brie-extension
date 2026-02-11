import type { CAPTURE, RECORD, AUTH, TAB, REWIND } from '@extension/shared';

export type CaptureType = 'area' | 'viewport' | 'full-page';
export type CaptureState = 'idle' | 'capturing' | 'unsaved';

export type BgMessage =
  | { type: typeof CAPTURE.EXIT }
  | { type: typeof RECORD.ADD; data: unknown }
  | { type: typeof RECORD.GET_ALL }
  | { type: typeof RECORD.DELETE_ALL }
  | { type: typeof AUTH.START }
  | { type: typeof TAB.GET_ACTIVE }
  | { type: typeof REWIND.EVENT_BATCH; events: unknown[]; t0: number }
  | { type: typeof REWIND.FREEZE; tabId: unknown }
  | { type: typeof REWIND.GET_FROZEN }
  | { type: typeof REWIND.RESET_TAB; tabId: unknown }
  | { type: typeof REWIND.DELETE_TAB }
  | { action: typeof CAPTURE.CHECK_NATIVE }
  | { action: typeof CAPTURE.VISIBLE_TAB };

export type BgResponse =
  | { status: 'success' }
  | { records: unknown[] }
  | { success: boolean; dataUrl?: string; message?: string }
  | { ok: boolean; error?: string }
  | { isAvailable: boolean }
  | { tab: any };

export type RecordType = 'events' | 'network' | 'console' | 'cookies';
export interface Record {
  recordType: RecordType;
  url: string;
  requestId?: string;
  requestBody?: {
    raw?: { bytes: ArrayBuffer }[];
    decoded?: any;
    parsed?: any;
  };
  type: string;
  domain?: string;
  [key: string]: any;
}
