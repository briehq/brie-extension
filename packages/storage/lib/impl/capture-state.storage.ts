import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorage } from '../base/types.js';

type CaptureState = 'idle' | 'capturing' | 'unsaved';

type CaptureStateStorage = BaseStorage<CaptureState> & {
  setCaptureState: (state: CaptureState) => Promise<void>;
  getCaptureState: () => Promise<CaptureState>;
};

const storage = createStorage<CaptureState>(
  'capture-state-storage-key',
  'idle', // Default state is idle
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

export const captureStateStorage: CaptureStateStorage = {
  ...storage,

  // Set the capture state (idle, capturing, unsaved)
  setCaptureState: async (state: CaptureState) => {
    await storage.set(state);
  },

  // Get the current capture state
  getCaptureState: async () => {
    return await storage.get();
  },
};
