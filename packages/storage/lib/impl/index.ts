export { annotationsHistoryStorage, annotationsRedoStorage, annotationsStorage } from './annotations/index.js';
export { authIdentityProviderStorage, authTokensStorage } from './auth/index.js';
export type {
  CaptureMode,
  ScreenshotCaptureState,
  VideoRecordingState,
  CaptureState,
  RecordingSettings,
  RecordingSettingsStorage,
} from './capture/index.js';
export {
  captureNotifyStorage,
  captureStateStorage,
  captureTabStorage,
  recordingSettingsStorage,
} from './capture/index.js';
export type { AuthTokensStorage, AuthIdentityProviderStorage } from './auth/index.js';
export type { CaptureNotifyStorage } from './capture/index.js';

export * from './theme.storage.js';
export * from './user-uuid.storage.js';
export * from './pending-reload-tabs.storage.js';
