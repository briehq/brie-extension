import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

interface State {
  tick: number;
  lastAction: CanvasAction | null;
}

const initialState: State = { tick: 0, lastAction: null };

export const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    triggerCanvasAction(state, action: PayloadAction<CanvasAction>) {
      state.tick += 1;
      state.lastAction = action.payload;
    },
    clearCanvasState(state) {
      state.lastAction = null;
      state.tick = 0;
    },
  },
});

export type CanvasAction = 'UNDO' | 'REDO' | 'START_OVER';
