export const CAPTURE = {
  EXIT: 'CAPTURE:EXIT',
  CHECK_NATIVE: 'CAPTURE:CHECK_NATIVE',
  VISIBLE_TAB: 'CAPTURE:VISIBLE_TAB',
} as const;

export type CaptureMsg = (typeof CAPTURE)[keyof typeof CAPTURE];
