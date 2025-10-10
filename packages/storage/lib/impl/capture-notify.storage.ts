import { createStorage } from '../base/base.js';
import { StorageEnum } from '../base/enums.js';
import type { BaseStorage } from '../base/types.js';

export type CaptureNotifyStorage = { notified: boolean } | null;

/**
 * Persistent flag that displays, "Screenshot captured, continue or go to edit"
 */
export const captureNotifyStorage: BaseStorage<CaptureNotifyStorage> = createStorage(
  'capture-notify-storage-key',
  {} as CaptureNotifyStorage,
  { storageEnum: StorageEnum.Local, liveUpdate: true },
);
