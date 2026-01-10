import { createStorage } from '../../base/base.js';
import { StorageEnum } from '../../base/enums.js';
import type { BaseStorage } from '../../base/types.js';

type CaptureStateValue = ScreenshotCaptureState | VideoRecordingState;

type CaptureStateStorage = BaseStorage<CaptureState> & {
  setModeAndState: (mode: CaptureMode, state: CaptureStateValue) => Promise<void>;
  getModeAndState: () => Promise<CaptureState>;

  setScreenshotState: (state: ScreenshotCaptureState) => Promise<void>;
  setVideoState: (state: VideoRecordingState) => Promise<void>;

  getMode: () => Promise<CaptureMode>;
  getState: () => Promise<CaptureStateValue>;
};

const defaultState: CaptureState = {
  mode: 'screenshot',
  state: 'idle',
};

const storage = createStorage<CaptureState>('capture-state-storage-key', defaultState, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const captureStateStorage: CaptureStateStorage = {
  ...storage,

  setModeAndState: async (mode: CaptureMode, state: CaptureStateValue) => {
    await storage.set({ mode, state });
  },

  getModeAndState: async () => {
    return await storage.get();
  },

  setScreenshotState: async (state: ScreenshotCaptureState) => {
    await storage.set({ mode: 'screenshot', state });
  },

  setVideoState: async (state: VideoRecordingState) => {
    await storage.set({ mode: 'video', state });
  },

  getMode: async () => {
    const current = await storage.get();
    return current.mode;
  },

  getState: async () => {
    const current = await storage.get();
    return current.state;
  },
};

export type CaptureMode = 'screenshot' | 'video';
export type ScreenshotCaptureState = 'idle' | 'preparing' | 'capturing' | 'error' | 'unsaved';
export type VideoRecordingState = 'idle' | 'preparing' | 'capturing' | 'paused' | 'error' | 'unsaved';
export interface CaptureState {
  mode: CaptureMode;
  state: CaptureStateValue;
}
