import { recordingSettingsStorage } from '@extension/storage';
import type { MicPermission } from '@extension/storage';

export const syncMicPermission = async (): Promise<void> => {
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });

    const mapped: MicPermission =
      status.state === 'granted' ? 'granted' : status.state === 'denied' ? 'denied' : 'unknown';

    await recordingSettingsStorage.setMicPermission(mapped);
  } catch {
    // Firefox doesn't support permissions.query for microphone — ignore
  }
};
