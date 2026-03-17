export const ERROR = {
  DETECTED: 'ERROR:DETECTED',
} as const;

export type ErrorMsg = (typeof ERROR)[keyof typeof ERROR];
