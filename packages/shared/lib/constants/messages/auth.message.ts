export const AUTH = {
  START: 'AUTH:START',
  STATUS: 'AUTH:STATUS',
} as const;

export type AuthMsg = (typeof AUTH)[keyof typeof AUTH];
