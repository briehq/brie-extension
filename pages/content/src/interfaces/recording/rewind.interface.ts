export type RewindMessage =
  | { type: 'REWIND/ENABLE'; tabId: number; enabled: boolean }
  | { type: 'REWIND/EVENT_BATCH'; tabId: number; events: any[]; t0: number }
  | { type: 'REWIND/FREEZE'; tabId: number }
  | { type: 'REWIND/GET_FROZEN'; tabId: number }
  | { type: 'REWIND/CLEAR'; tabId: number };

export type RewindReply =
  | { ok: true }
  | { ok: true; frozen?: { tabId: number; fromTs: number; toTs: number; events: any[] } }
  | { ok: false; error: string };
