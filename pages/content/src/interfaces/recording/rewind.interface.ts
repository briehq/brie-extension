import type { REWIND } from '@extension/shared';

export type RewindMessage =
  | { type: typeof REWIND.ENABLE; tabId: number; enabled: boolean }
  | { type: typeof REWIND.EVENT_BATCH; tabId: number; events: any[]; t0: number }
  | { type: typeof REWIND.FREEZE; tabId: number }
  | { type: typeof REWIND.GET_FROZEN; tabId: number }
  | { type: typeof REWIND.CLEAR; tabId: number };

export type RewindReply =
  | { ok: true }
  | { ok: true; frozen?: { tabId: number; fromTs: number; toTs: number; events: any[] } }
  | { ok: false; error: string };
