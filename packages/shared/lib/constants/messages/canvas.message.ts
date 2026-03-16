export const CANVAS_ACTION = {
  UNDO: 'CANVAS:UNDO',
  REDO: 'CANVAS:REDO',
  START_OVER: 'CANVAS:START_OVER',
} as const;

export type CanvasAction = (typeof CANVAS_ACTION)[keyof typeof CANVAS_ACTION];
