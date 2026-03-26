# Microphone Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable microphone audio capture during video recording, with permission handling via a dedicated page, toggle from popup and mute/unmute from toolbar.

**Architecture:** Mic captured via `getUserMedia()` as a separate stream, merged with the video-only `getDisplayMedia()` stream. Permission handled in a dedicated extension page since popups can't trigger `getUserMedia()`. Storage tracks mic state reactively across popup, toolbar, and content scripts. Toolbar mute/unmute is separate from the user preference (enabled) to avoid corrupting future recording settings.

**Tech Stack:** Chrome Extension APIs, MediaStream API, React, `@extension/storage`, `@extension/ui`

**Spec:** `docs/superpowers/specs/2026-03-26-microphone-feature-design.md`

---

### Task 1: Extend recording settings storage

**Files:**
- Modify: `packages/storage/lib/impl/capture/settings.storage.ts`

- [ ] **Step 1: Add `activeTrack` and `muted` fields to `RecordingSettings` interface**

`activeTrack` tracks whether the current recording has a mic track. `muted` tracks the mute state during recording (separate from `enabled` which is the user preference for future recordings).

```typescript
export interface RecordingSettings {
  mic: {
    enabled: boolean;
    permission: MicPermission;
    activeTrack: boolean;
    muted: boolean;
  };
}
```

Update the default:

```typescript
const defaultSettings: RecordingSettings = {
  mic: {
    enabled: true,
    permission: 'unknown',
    activeTrack: false,
    muted: false,
  },
};
```

- [ ] **Step 2: Add `setMicActiveTrack` and `setMicMuted` methods**

Add to the `recordingSettingsStorage` object:

```typescript
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
```

- [ ] **Step 3: Update the `RecordingSettingsStorage` type**

```typescript
export type RecordingSettingsStorage = BaseStorage<RecordingSettings> & {
  setMicEnabled: (enabled: boolean) => Promise<void>;
  setMicPermission: (perm: MicPermission) => Promise<void>;
  setMicActiveTrack: (active: boolean) => Promise<void>;
  setMicMuted: (muted: boolean) => Promise<void>;
  getSettings: () => Promise<RecordingSettings>;
};
```

- [ ] **Step 4: Commit**

```bash
git add packages/storage/lib/impl/capture/settings.storage.ts
git commit -m "feat(storage): add activeTrack and muted fields to mic recording settings"
```

---

### Task 2: Rework video capture to use separate mic stream

**Files:**
- Modify: `pages/content/src/capture/video.capture.ts`
- Modify: `pages/content/src/interfaces/recording/capture-options.interface.ts`

- [ ] **Step 1a: Add `MIC_FALLBACK` constant to shared recording messages**

In `packages/shared/lib/constants/messages/recording.message.ts`, add to the `RECORDING` object:

```typescript
MIC_FALLBACK: 'RECORDING:MIC_FALLBACK',
```

This keeps the event namespaced and type-safe — avoids silent failures from typos in raw strings.

- [ ] **Step 1b: Add mic module variables**

After the existing `let audioTrack` line (line 14) in `video.capture.ts`, add:

```typescript
let micStream: MediaStream | null = null;
let micAudioTrack: MediaStreamTrack | null = null;
```

- [ ] **Step 2: Update `buildDisplayMediaConstraints` to always disable audio**

Replace the function (remove `options.audio` usage):

```typescript
const buildDisplayMediaConstraints = (captureType: CaptureOptions['captureType']): MediaStreamConstraints => {
  const isDesktop = captureType === 'desktop';

  return {
    preferCurrentTab: !isDesktop,
    audio: false,
    video: {
      displaySurface: isDesktop ? 'monitor' : 'browser',
    },
  };
};
```

- [ ] **Step 3: Update `beginPreparingRecording` default**

Change the fallback in `beginPreparingRecording`:

```typescript
pendingOptions = options ?? { captureType: 'tab' };
```

Remove the `audio: false` default — `audio` is no longer part of `CaptureOptions` for driving `getDisplayMedia`.

- [ ] **Step 4: Update `startCaptureNow` to acquire mic via `getUserMedia`**

Replace the section from `const { mic }` through `if (!enableAudio && audioTrack) audioTrack.enabled = false;` with:

```typescript
const { mic } = await recordingSettingsStorage.getSettings();
const wantMic = !!mic.enabled && mic.permission === 'granted';

const captureType = pendingOptions?.captureType ?? 'tab';
const captureOptions = { captureType, hasMic: wantMic };
const constraints = buildDisplayMediaConstraints(captureType);
const mimeOptions = pickMimeType();

window.dispatchEvent(
  new CustomEvent(VIDEO.METADATA, {
    detail: {
      action: 'START',
      startedAt: segments[0]?.startAt ?? Date.now(),
      options: captureOptions,
    },
  }),
);

stream = await navigator.mediaDevices.getDisplayMedia(constraints);

// Remove any unexpected audio tracks from the display stream
stream.getAudioTracks().forEach(t => t.stop());

let recordingStream = stream;

if (wantMic) {
  try {
    // Timeout guard: getUserMedia can hang if the permission prompt is ignored
    micStream = await Promise.race([
      navigator.mediaDevices.getUserMedia({ audio: true }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('getUserMedia timeout')), 5000)
      ),
    ]);
    micAudioTrack = micStream.getAudioTracks()[0] ?? null;

    if (micAudioTrack) {
      recordingStream = new MediaStream([
        ...stream.getVideoTracks(),
        micAudioTrack,
      ]);
      await recordingSettingsStorage.setMicActiveTrack(true);
      await recordingSettingsStorage.setMicMuted(false);
    }
  } catch (err) {
    console.warn('[brie | Recording] Mic unavailable, recording without audio:', err);
    await recordingSettingsStorage.setMicPermission('denied');
    await recordingSettingsStorage.setMicActiveTrack(false);
    micStream = null;
    micAudioTrack = null;
    // Notify user via window event (content-ui listens and shows toast)
    window.dispatchEvent(new CustomEvent(RECORDING.MIC_FALLBACK));
  }
}

audioTrack = micAudioTrack;
```

Then update the `MediaRecorder` line:

```typescript
recorder = new MediaRecorder(recordingStream, mimeOptions);
```

- [ ] **Step 4b: Fix `recorder.onstop` handler — replace stale `options` reference**

The existing `recorder.onstop` callback (around line 150-170) references `options ?? {}` in two `VIDEO.METADATA` dispatches. After this refactor, the local `options` variable no longer exists. Replace all references to `options` inside `recorder.onstop` with `captureOptions` (the const captured before `getDisplayMedia()`):

```typescript
// In recorder.onstop, replace:
//   options: options ?? {}
// with:
//   options: captureOptions
```

This applies to both the `VIDEO.CAPTURED` detail and the `VIDEO.METADATA STOP` detail.

- [ ] **Step 5: Add native stream end handler for mic cleanup**

After `recorder.start(1000);` and before `setState('capturing');`, add:

```typescript
const videoTrack = stream.getVideoTracks()[0];
if (videoTrack) {
  videoTrack.addEventListener('ended', () => {
    cleanupMic();
  });
}
```

- [ ] **Step 6: Update `toggleMic` to use `micAudioTrack` and track muted state**

```typescript
export const toggleMic = async () => {
  if (!micAudioTrack) return;
  micAudioTrack.enabled = !micAudioTrack.enabled;
  await recordingSettingsStorage.setMicMuted(!micAudioTrack.enabled);
};
```

- [ ] **Step 7: Add `cleanupMic` helper and update `cleanup`**

Add before the existing `cleanup` function:

```typescript
const cleanupMic = () => {
  if (micStream) {
    micStream.getTracks().forEach(track => {
      try { track.stop(); } catch { /* */ }
    });
  }
  micStream = null;
  micAudioTrack = null;
  audioTrack = null;
  recordingSettingsStorage.setMicActiveTrack(false);
  recordingSettingsStorage.setMicMuted(false);
};
```

Update the existing `cleanup` function — add `cleanupMic()` call after `stream = null;`:

```typescript
export const cleanup = () => {
  clearAutoStop();

  try {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  } catch { /* */ }

  recorder = null;

  if (stream) {
    stream.getTracks().forEach(track => {
      try { track.stop(); } catch { /* */ }
    });
  }

  stream = null;
  cleanupMic();
  pendingOptions = null;
  activeSegmentStartAt = null;
  chunks = [];
  segments = [];
};
```

- [ ] **Step 8: Update `CaptureOptions` interface**

Modify `pages/content/src/interfaces/recording/capture-options.interface.ts`:

```typescript
export interface CaptureOptions {
  captureType?: 'tab' | 'desktop';
}
```

Remove `audio` entirely — mic decision is read from storage at recording start, not passed as an option.

- [ ] **Step 9: Verify build passes**

Run: `cd /Users/luminitaleu/Documents/ion/apps/briehq/brie-extension && pnpm type-check`

- [ ] **Step 10: Commit**

```bash
git add pages/content/src/capture/video.capture.ts pages/content/src/interfaces/
git commit -m "feat(recording): capture mic via getUserMedia, merge with display stream"
```

---

### Task 3: Create mic permission page

**Files:**
- Create: `pages/mic-permission/index.html`
- Create: `pages/mic-permission/src/index.tsx`
- Create: `pages/mic-permission/src/MicPermission.tsx`
- Create: `pages/mic-permission/package.json`
- Create: `pages/mic-permission/vite.config.mts`
- Create: `pages/mic-permission/tsconfig.json`
- Create: `pages/mic-permission/tailwind.config.ts`

- [ ] **Step 1: Create `pages/mic-permission/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Microphone Permission — Brie</title>
  </head>
  <body>
    <div id="app-container"></div>
    <script type="module" src="./src/index.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `pages/mic-permission/package.json`**

```json
{
  "name": "@extension/mic-permission",
  "version": "0.6.50",
  "description": "chrome extension - microphone permission page",
  "type": "module",
  "private": true,
  "sideEffects": true,
  "files": ["dist/**"],
  "scripts": {
    "clean:node_modules": "pnpx rimraf node_modules",
    "clean:turbo": "rimraf .turbo",
    "clean": "pnpm clean:turbo && pnpm clean:node_modules",
    "build": "vite build",
    "dev": "vite build --mode development",
    "lint": "eslint .",
    "lint:fix": "pnpm lint --fix",
    "format": "prettier . --write --ignore-path ../../.prettierignore",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@extension/storage": "workspace:*",
    "@extension/ui": "workspace:*"
  },
  "devDependencies": {
    "@extension/tailwindcss-config": "workspace:*",
    "@extension/tsconfig": "workspace:*",
    "@extension/vite-config": "workspace:*"
  },
  "postcss": {
    "plugins": {
      "tailwindcss": {},
      "autoprefixer": {}
    }
  }
}
```

- [ ] **Step 3: Create `pages/mic-permission/vite.config.mts`**

```typescript
import { resolve } from 'node:path';
import { withPageConfig } from '@extension/vite-config';

const rootDir = resolve(import.meta.dirname);
const srcDir = resolve(rootDir, 'src');

export default withPageConfig({
  resolve: {
    alias: {
      '@src': srcDir,
    },
  },
  build: {
    outDir: resolve(rootDir, '..', '..', 'dist', 'mic-permission'),
  },
});
```

- [ ] **Step 4: Create `pages/mic-permission/tsconfig.json`**

```json
{
  "extends": "@extension/tsconfig/base",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@src/*": ["src/*"]
    },
    "types": ["chrome", "node"]
  },
  "include": ["src", "vite.config.mts", "tailwind.config.ts"]
}
```

- [ ] **Step 5: Create `pages/mic-permission/tailwind.config.ts`**

```typescript
import { withUI } from '@extension/ui';

export default withUI({
  content: ['index.html', 'src/**/*.tsx'],
});
```

- [ ] **Step 6: Create `pages/mic-permission/src/index.tsx`**

```tsx
import { createRoot } from 'react-dom/client';
import '@extension/ui/dist/global.css';
import { MicPermission } from './MicPermission';

const root = document.getElementById('app-container');
if (root) {
  createRoot(root).render(<MicPermission />);
}
```

- [ ] **Step 7: Create `pages/mic-permission/src/MicPermission.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { recordingSettingsStorage } from '@extension/storage';
import { Button, Icon } from '@extension/ui';

type PageState = 'requesting' | 'granted' | 'denied' | 'error';

export const MicPermission = () => {
  const [state, setState] = useState<PageState>('requesting');
  const extensionId = chrome.runtime.id;

  const requestPermission = useCallback(async () => {
    setState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      await recordingSettingsStorage.setMicPermission('granted');
      setState('granted');
      setTimeout(() => window.close(), 2000);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        await recordingSettingsStorage.setMicPermission('denied');
        setState('denied');
      } else {
        setState('error');
      }
    }
  }, []);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Icon name={state === 'granted' ? 'Mic' : 'MicOff'} className="h-8 w-8" />
        </div>

        {state === 'requesting' && (
          <>
            <h1 className="text-xl font-semibold text-foreground">Microphone Permission</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Allow Brie to access your microphone to record audio with your screen captures.
            </p>
          </>
        )}

        {state === 'granted' && (
          <>
            <h1 className="text-xl font-semibold text-green-600">Microphone Enabled</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You're all set. This tab will close automatically.
            </p>
          </>
        )}

        {state === 'denied' && (
          <>
            <h1 className="text-xl font-semibold text-red-600">Microphone Access Denied</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your browser blocked microphone access. To fix this:
            </p>
            <ol className="mt-4 space-y-2 text-left text-sm text-muted-foreground">
              <li>1. Open <code className="rounded bg-muted px-1 py-0.5 text-xs">chrome://settings/content/microphone</code></li>
              <li>2. Find <code className="rounded bg-muted px-1 py-0.5 text-xs">chrome-extension://{extensionId}</code> in the blocked list</li>
              <li>3. Remove it from the list</li>
              <li>4. Come back here and click "Try again"</li>
            </ol>
            <Button onClick={requestPermission} className="mt-6">
              Try again
            </Button>
          </>
        )}

        {state === 'error' && (
          <>
            <h1 className="text-xl font-semibold text-red-600">Something Went Wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              An unexpected error occurred while requesting microphone access.
            </p>
            <Button onClick={requestPermission} className="mt-6">
              Try again
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 8: Install dependencies and verify build**

```bash
cd /Users/luminitaleu/Documents/ion/apps/briehq/brie-extension && pnpm install && pnpm build
```

- [ ] **Step 9: Verify the page is accessible**

After build, check that `dist/mic-permission/index.html` exists. Load the extension in Chrome and open `chrome-extension://<id>/mic-permission/index.html` manually to verify it renders.

- [ ] **Step 10: Commit**

```bash
git add pages/mic-permission/
git commit -m "feat(mic-permission): add dedicated permission page"
```

---

### Task 4: Fix popup mic toggle, badge, and add recording guard

**Files:**
- Modify: `pages/popup/src/components/capture/ui/mic-toggle.ui.tsx`
- Modify: `pages/popup/src/components/capture/capture-content.view.tsx`
- Modify: `pages/popup/src/components/capture/views/record-video.view.tsx`

- [ ] **Step 1: Fix `mic-toggle.ui.tsx` — replace entire `handleOnToggleMic`**

The existing callback has three branches with `@todo` comments. Replace the entire `handleOnToggleMic`:

```typescript
const handleOnToggleMic = useCallback(async () => {
  if (micPermission === 'granted') {
    await recordingSettingsStorage.setMicEnabled(!micEnabled);
    return;
  }

  // Both 'denied' and 'unknown' open the permission page
  chrome.tabs.create({
    url: chrome.runtime.getURL('mic-permission/index.html'),
    active: true,
  });
}, [micEnabled, micPermission]);
```

This fixes: (a) `denied` branch no longer returns early, (b) URL updated from `mic-permission.html` to `mic-permission/index.html`.

**Note:** After Step 2 wires mic toggle logic directly into `capture-content.view.tsx`, the standalone `MicToggleButton` component may become unused. Check if it's imported anywhere else — if not, delete `mic-toggle.ui.tsx` and its export from the barrel file to avoid dead code.

- [ ] **Step 2: Wire storage to `capture-content.view.tsx` instead of local state**

The current `capture-content.view.tsx` uses `popupState.micEnabled` (local React state) which is disconnected from `recordingSettingsStorage`. Replace with storage-backed state.

Add import at the top of `capture-content.view.tsx`:

```typescript
import { recordingSettingsStorage } from '@extension/storage';
import type { BaseStorage, CaptureState, RecordingSettings, RewindSettings, ScreenshotCaptureState } from '@extension/storage';
```

Add storage subscription after the existing `useStorage` calls (around line 22):

```typescript
const { mic } = useStorage<BaseStorage<RecordingSettings>>(recordingSettingsStorage);
```

Replace `isMicEnabled` prop at line 190:

```typescript
isMicEnabled={!!mic?.enabled && mic?.permission === 'granted'}
```

Replace the `onToggleMic` callback at line 92-96 with:

```typescript
const onToggleMic = useCallback(async () => {
  if (mic?.permission === 'granted') {
    await recordingSettingsStorage.setMicEnabled(!mic?.enabled);
  } else {
    chrome.tabs.create({
      url: chrome.runtime.getURL('mic-permission/index.html'),
      active: true,
    });
  }
}, [mic?.enabled, mic?.permission]);
```

Remove `micEnabled` from the `popupState` useState initial value (line 27) and `PopupState` usage — it's no longer needed there.

- [ ] **Step 3: Update `record-video.view.tsx` badge to always render**

Change the `right` prop from conditional to always-rendered:

```tsx
right={
  <StatusBadge
    state={isMicEnabled}
    icon={<Icon name={isMicEnabled ? 'Mic' : 'MicOff'} className="h-3.5 w-3.5" />}
    label={isMicEnabled ? t('statusOn') : t('statusOff')}
    ariaLabel={t('toggleMic')}
    onClick={onToggleMic}
  />
}
```

Remove the `isMicEnabled &&` wrapper that currently hides the badge when mic is off.

- [ ] **Step 4: Disable mic toggle during active recording**

In `capture-content.view.tsx`, add a `disabled` prop or guard to the `onToggleMic` passed to `RecordVideoView`:

```typescript
onToggleMic={isVideoRecordingActive ? undefined : onToggleMic}
```

In `record-video.view.tsx`, update the `StatusBadge` to show disabled state when `onToggleMic` is undefined:

```tsx
right={
  <StatusBadge
    state={isMicEnabled}
    icon={<Icon name={isMicEnabled ? 'Mic' : 'MicOff'} className="h-3.5 w-3.5" />}
    label={isMicEnabled ? t('statusOn') : t('statusOff')}
    ariaLabel={isActive ? t('micLockedDuringRecording') : t('toggleMic')}
    onClick={onToggleMic}
    disabled={!onToggleMic}
  />
}
```

Note: check if `StatusBadge` accepts a `disabled` prop. If not, conditionally set `onClick={onToggleMic}` and add `className="opacity-50 cursor-not-allowed"` when disabled.

- [ ] **Step 5: Commit**

```bash
git add pages/popup/src/components/capture/
git commit -m "feat(popup): fix mic toggle, wire storage, disable during recording"
```

---

### Task 5: Add i18n keys for mic feature

**Files:**
- Modify: `packages/i18n/locales/en/messages.json`

- [ ] **Step 1: Add mic-related i18n keys**

Find the English messages file and add:

```json
"muteMic": "Mute mic",
"unmuteMic": "Unmute mic",
"toggleMic": "Toggle microphone",
"micLockedDuringRecording": "Stop recording to change mic settings"
```

Add these keys in the appropriate alphabetical position within the messages file.

- [ ] **Step 2: Add same keys to other locale files**

Check how many locales exist. For each locale file in `packages/i18n/locales/*/messages.json`, add the same keys (English is fine as a placeholder for untranslated locales — the existing pattern handles fallback).

- [ ] **Step 3: Commit**

```bash
git add packages/i18n/
git commit -m "feat(i18n): add mic toggle translation keys"
```

---

### Task 6: Uncomment and wire toolbar mic button

**Files:**
- Modify: `pages/content-ui/src/components/recording-view/ui/toolbar.ui.tsx`

- [ ] **Step 1: Read `activeTrack` and `muted` from storage**

After `const micEnabled = mic.enabled ?? false;` (line 25), add:

```typescript
const hasActiveMicTrack = mic.activeTrack ?? false;
const isMicMuted = mic.muted ?? false;
```

- [ ] **Step 2: Update `handleOnToggleMic` to use `muted` instead of `enabled`**

Replace the existing `handleOnToggleMic`:

```typescript
const handleOnToggleMic = useCallback(async () => {
  safePostMessage(RECORDING.TOGGLE_MIC);
  // toggleMic in video.capture.ts handles the actual track and updates storage
}, []);
```

The `toggleMic()` function in `video.capture.ts` (Task 2 Step 6) now writes `setMicMuted()` to storage, so the toolbar icon updates reactively. No need to call `setMicEnabled` from the toolbar — that would corrupt the user preference.

- [ ] **Step 3: Replace commented-out mic section with conditional button**

Replace the entire commented-out mic section (lines 83-105) with:

```tsx
{hasActiveMicTrack && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="cursor-pointer shadow-none disabled:cursor-not-allowed"
        onClick={handleOnToggleMic}>
        {isMicMuted ? (
          <Icon name="MicOff" className="size-4 text-red-400" />
        ) : (
          <Icon name="Mic" className="size-4" />
        )}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="top">
      {isMicMuted ? t('unmuteMic') : t('muteMic')}
    </TooltipContent>
  </Tooltip>
)}
```

Note: icons are now driven by `isMicMuted` (not `micEnabled`) — muting during recording does not change the user's preference for future recordings.

- [ ] **Step 4: Commit**

```bash
git add pages/content-ui/src/components/recording-view/ui/toolbar.ui.tsx
git commit -m "feat(toolbar): enable mic mute/unmute button during recording"
```

---

### Task 7: Add mic fallback toast in content-ui

**Files:**
- Modify: `pages/content-ui/src/content.tsx` (or the appropriate App-level component that has toast access)

- [ ] **Step 1: Listen for mic fallback event**

In the component that initializes the content-ui (where toast is available), add a listener using the shared `RECORDING.MIC_FALLBACK` constant:

```typescript
import { RECORDING } from '@extension/shared';

useEffect(() => {
  const handler = () => {
    toast.error('Mic unavailable — recording without audio', { duration: 5000 });
  };
  window.addEventListener(RECORDING.MIC_FALLBACK, handler);
  return () => window.removeEventListener(RECORDING.MIC_FALLBACK, handler);
}, []);
```

- [ ] **Step 2: Commit**

```bash
git add pages/content-ui/src/
git commit -m "feat(content-ui): show toast when mic falls back to no-audio"
```

---

### Task 8: Add permission sync on popup open

**Note:** `navigator.permissions.query({ name: 'microphone' })` is NOT available in Manifest V3 service workers (background script). It throws a TypeError. The sync must run in a page context — the popup is the natural place since it opens frequently.

**Files:**
- Modify: `pages/popup/src/components/capture/capture-content.view.tsx`

- [ ] **Step 1: Add permission sync in `capture-content.view.tsx`**

Add a `useEffect` that runs on mount to sync mic permission state:

```typescript
useEffect(() => {
  (async () => {
    try {
      const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      const permission = status.state === 'granted' ? 'granted' : status.state === 'denied' ? 'denied' : 'unknown';
      const settings = await recordingSettingsStorage.getSettings();

      if (settings.mic.permission !== permission) {
        await recordingSettingsStorage.setMicPermission(permission);
      }
    } catch {
      // navigator.permissions.query may not be available (Firefox)
    }
  })();
}, []);
```

This syncs on every popup open, catching cases where the user changed mic permissions via Chrome settings between sessions.

- [ ] **Step 2: Commit**

```bash
git add pages/popup/src/components/capture/capture-content.view.tsx
git commit -m "feat(popup): sync mic permission state on popup open"
```

---

### Task 9: Fix accurate webm trim to preserve audio

**Files:**
- Modify: `pages/content-ui/src/utils/recording/video-trim.util.ts`

- [ ] **Step 1: Add audio codec flag to `argsAccurateWebm`**

The `argsAccurateWebm` array uses `-vf` for video re-encoding but has no `-c:a` flag, which means FFmpeg drops the audio track during accurate trim. Add `-c:a libopus` to preserve mic audio:

Find the `argsAccurateWebm` array and add `-c:a`, `libopus` after the video codec flags. The exact edit depends on the current array structure, but the goal is:

```typescript
// Add after video flags, before output name:
'-c:a', 'libopus',
```

The fast-path `argsFastWebm` already uses `-c copy` which preserves all streams including audio — no change needed there.

- [ ] **Step 2: Commit**

```bash
git add pages/content-ui/src/utils/recording/video-trim.util.ts
git commit -m "fix(video-trim): preserve audio track in accurate webm trim"
```

---

### Task 10: Verify build and manifest

**Note:** Previously Task 9.

- [ ] **Step 1: Full build**

```bash
cd /Users/luminitaleu/Documents/ion/apps/briehq/brie-extension && pnpm install && pnpm build
```

- [ ] **Step 2: Verify `dist/mic-permission/index.html` exists**

```bash
ls dist/mic-permission/index.html
```

If the file doesn't exist, check:
- Is `pages/mic-permission` picked up by `pnpm-workspace.yaml` (`'pages/*'` glob)?
- Is the turbo build running it? Check `turbo.json` for build pipeline config.
- Does the manifest need an explicit reference? Check `chrome-extension/manifest.ts` for how other pages are registered.

- [ ] **Step 3: Load extension in Chrome and verify**

1. Go to `chrome://extensions`, reload the extension
2. Open `chrome-extension://<id>/mic-permission/index.html` directly — verify it renders
3. Open popup, click mic toggle — verify it opens the permission page

- [ ] **Step 4: Commit any manifest/build fixes if needed**

```bash
git add -A
git commit -m "fix(build): ensure mic-permission page is included in extension bundle"
```

---

### Task 11: Manual testing checklist

- [ ] **Test 1: First-time mic flow**
  - Fresh install or clear extension storage
  - Open popup → click mic toggle
  - Verify permission page opens in new tab
  - Allow mic → verify "Microphone Enabled" shown, tab auto-closes
  - Open popup → mic badge shows "on"

- [ ] **Test 2: Recording with mic**
  - Enable mic in popup → start recording
  - Verify Chrome share dialog's audio checkbox is NOT checked (we pass `audio: false`)
  - Verify toolbar shows mic button (Mic icon, not muted)
  - Click mic button → icon changes to MicOff (red), tooltip says "Unmute mic"
  - Click again → icon changes back to Mic, tooltip says "Mute mic"
  - Verify popup still shows mic badge "on" (mute didn't corrupt preference)
  - Stop recording → verify video has audio track

- [ ] **Test 3: Recording without mic**
  - Disable mic in popup → start recording
  - Verify toolbar does NOT show mic button
  - Stop recording → verify video has no audio track

- [ ] **Test 4: Denied permission flow**
  - Deny mic permission in browser prompt
  - Verify permission page shows instructions with extension ID
  - Click popup mic toggle → verify permission page reopens (not just returning early)
  - Clear permission from `chrome://settings/content/microphone`
  - Click "Try again" → verify permission granted

- [ ] **Test 5: Native stream end**
  - Start recording with mic enabled
  - Click browser's "Stop sharing" button (not toolbar stop)
  - Verify mic stream is stopped (no lingering mic access indicator in browser)

- [ ] **Test 6: Permission sync**
  - Grant mic permission
  - Manually block mic in `chrome://settings/content/microphone`
  - Restart the extension (reload from `chrome://extensions`)
  - Open popup → verify badge shows "off" (permission synced to denied)

- [ ] **Test 7: Popup toggle disabled during recording**
  - Start recording with mic enabled
  - Open popup → verify mic badge/toggle is disabled (can't click)
  - Stop recording → verify toggle is re-enabled

- [ ] **Test 8: getUserMedia failure fallback**
  - Enable mic, grant permission
  - Manually revoke mic between toggle and recording start (hard to reproduce — alternatively, test by temporarily modifying code to throw)
  - Verify toast "Mic unavailable — recording without audio" appears
  - Verify recording continues without audio
  - Verify storage permission updated to "denied"

- [ ] **Test 9: Firefox**
  - Repeat tests 1-3 on Firefox
  - Verify permission sync gracefully skips if `navigator.permissions.query` fails

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat: microphone audio capture for video recording"
```
