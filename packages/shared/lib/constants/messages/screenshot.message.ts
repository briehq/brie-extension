export const SCREENSHOT = {
  START: 'SCREENSHOT:START',
  DISPLAY: 'SCREENSHOT:DISPLAY',
  STORE: 'SCREENSHOT:STORE',
} as const;

export type ScreenshotMsg = (typeof SCREENSHOT)[keyof typeof SCREENSHOT];
