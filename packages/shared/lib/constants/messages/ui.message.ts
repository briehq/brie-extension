export const UI = {
  CLOSE_MODAL: 'UI:CLOSE_MODAL',
  LAYOUT_RECALC: 'UI:LAYOUT_RECALC',
} as const;

export type UiMsg = (typeof UI)[keyof typeof UI];
