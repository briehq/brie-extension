import { createStorage } from '../../base/base.js';
import { StorageEnum } from '../../base/enums.js';
import type { BaseStorage } from '../../base/types.js';

const defaultSettings: RecordingSettings = {
  mic: {
    enabled: true,
    permission: 'unknown',
    activeTrack: false,
    muted: false,
  },
};

const storage = createStorage<RecordingSettings>('recording-settings', defaultSettings, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const recordingSettingsStorage: RecordingSettingsStorage = {
  ...storage,

  async setMicEnabled(enabled: boolean) {
    const settings = await storage.get();
    await storage.set({
      ...settings,
      mic: { ...settings.mic, enabled },
    });
  },

  async setMicPermission(permission: MicPermission) {
    const settings = await storage.get();
    await storage.set({
      ...settings,
      mic: { ...settings.mic, permission },
    });
  },

  async setMicActiveTrack(active: boolean) {
    const settings = await storage.get();
    await storage.set({
      ...settings,
      mic: { ...settings.mic, activeTrack: active },
    });
  },

  async setMicMuted(muted: boolean) {
    const settings = await storage.get();
    await storage.set({
      ...settings,
      mic: { ...settings.mic, muted },
    });
  },

  async getSettings() {
    return await storage.get();
  },
};

export type MicPermission = 'unknown' | 'granted' | 'denied';

export interface RecordingSettings {
  mic: {
    enabled: boolean;
    permission: MicPermission;
    activeTrack: boolean;
    muted: boolean;
  };
}

export type RecordingSettingsStorage = BaseStorage<RecordingSettings> & {
  setMicEnabled: (enabled: boolean) => Promise<void>;
  setMicPermission: (perm: MicPermission) => Promise<void>;
  setMicActiveTrack: (active: boolean) => Promise<void>;
  setMicMuted: (muted: boolean) => Promise<void>;
  getSettings: () => Promise<RecordingSettings>;
};
