import { recordingSettingsStorage } from '@extension/storage';
import type { MicPermission } from '@extension/storage';

/**
 * Sync the browser's microphone permission state to extension storage.
 * Runs on startup to catch permission changes made between sessions
 * (e.g. user revoked mic access in browser settings).
 *
 * Firefox doesn't support permissions.query for microphone — fails silently.
 */
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
