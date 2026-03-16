export const VIDEO = {
  CAPTURED: 'VIDEO:CAPTURED',
  METADATA: 'VIDEO:METADATA',
} as const;

export type VideoMsg = (typeof VIDEO)[keyof typeof VIDEO];
