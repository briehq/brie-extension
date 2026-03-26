# Microphone Feature for Video Recording

**Date:** 2026-03-26
**Status:** Draft

## Overview

Enable microphone audio capture during video recording in the Brie browser extension. Mic audio is captured via `getUserMedia({ audio: true })` and combined with the display video stream (which has `audio: false` — no system/tab audio). Users toggle mic from the popup before recording and mute/unmute from the floating toolbar during recording. A dedicated permission page handles browser mic permission since extension popups can't trigger `getUserMedia()`.

## Key Decisions

- **Mic only** — No system/tab audio. `getDisplayMedia()` always passes `audio: false`. The Chrome "Choose what to share" dialog's audio checkbox is irrelevant.
- **Separate streams** — Mic captured via `getUserMedia()`, video via `getDisplayMedia()`. Combined into a single `MediaStream` for `MediaRecorder`. This is new architecture — the current code passes `audio: enableAudio` to `getDisplayMedia()` which only captures tab audio, not mic. The entire capture flow in `video.capture.ts` needs to be reworked.
- **Permission page** — Dedicated page opened in a new tab for permission prompts. Extension popups close on blur and can't trigger `getUserMedia()`.
- **No mid-recording mic add** — If recording started without mic, the toolbar mic button is hidden. You can't add an audio track to an ongoing recording. User must stop, enable mic, and re-record.

## Permission Flow

### Three states (existing `MicPermission` type)

**`unknown`** — First time user. Clicking mic toggle in popup opens the permission page in a new tab (this branch already works in `mic-toggle.ui.tsx`). That page calls `getUserMedia({ audio: true })`, which triggers the browser's native permission prompt.
- Grant → storage updated to `granted`, tab auto-closes after 2 seconds.
- Deny → storage updated to `denied`, page shows recovery instructions.

**`granted`** — Toggle works normally. Clicking toggles `mic.enabled` in storage. No page opened.

**`denied`** — User previously denied mic access. Chrome won't re-prompt. Clicking mic toggle opens the permission page (this is the fix — currently `denied` returns early with a `@todo`). The page shows step-by-step instructions:
1. Go to `chrome://settings/content/microphone`
2. Find and remove the `chrome-extension://<id>` entry from the blocked list
3. Click "Try again" on the permission page to re-attempt `getUserMedia()`

### Permission sync on startup

Background service worker runs `navigator.permissions.query({ name: 'microphone' })` on startup and syncs the result to storage. This catches cases where the user manually changed permissions via Chrome settings between sessions.

Firefox fallback: `navigator.permissions.query({ name: 'microphone' })` may not be supported — wrap in try/catch, leave stored state unchanged if query fails.

## Recording Flow

### Current state (what exists now)

`video.capture.ts` currently passes `audio: enableAudio` to `getDisplayMedia()` via `buildDisplayMediaConstraints()`. The `audioTrack` variable refers to the audio track from the display stream (tab/system audio), not a mic stream. There is no `getUserMedia()` call anywhere. **This entire flow needs to be reworked** for the two-stream architecture.

### New flow

1. Read `mic.enabled` and `mic.permission` from `recordingSettingsStorage`
2. Call `getDisplayMedia({ audio: false, video: { displaySurface: ... } })` — **always no audio**
3. If `mic.enabled && mic.permission === 'granted'`:
   - Call `getUserMedia({ audio: true })` to get mic stream
   - Extract mic audio track from the mic stream
   - Create combined `MediaStream`: video tracks from display stream + audio track from mic stream
   - Store both references: `micAudioTrack` (for mute/unmute) and `micStream` (for cleanup)
4. If mic not enabled or permission not granted:
   - Use display stream as-is (video only, no audio)
5. Pass the final stream to `MediaRecorder`
6. Verify the mime type includes Opus audio codec when mic is active — the existing `pickMimeType()` candidates (`video/webm;codecs=vp9,opus`) already include Opus, but the implementation should confirm an audio-capable codec is selected when the stream has an audio track

### New module-level variables

```
let micStream: MediaStream | null = null;   // for cleanup
let micAudioTrack: MediaStreamTrack | null = null;  // for mute/unmute
```

### If `getUserMedia()` fails at recording start

Permission may have been revoked between the toggle and actual recording. Graceful fallback:
- Log the error
- Update storage permission to `denied`
- Continue recording without audio
- Show toast: "Mic unavailable — recording without audio"

### On recording stop

- Stop all mic stream tracks: `micStream?.getTracks().forEach(t => t.stop())`
- Set `micStream = null` and `micAudioTrack = null`
- Existing display stream cleanup remains unchanged

### On display stream ending natively

When the user clicks the browser's "Stop sharing" button, `stream.getVideoTracks()[0].onended` fires. The existing `cleanup()` only stops the display stream. **Must also stop the mic stream** in this handler to prevent the mic staying open after the recording ends.

### `toggleMic()` changes

Current `toggleMic()` toggles `audioTrack.enabled`. Change to toggle `micAudioTrack.enabled` instead. If `micAudioTrack` is null, return silently (no mic available).

## Toolbar Behavior

### When mic was enabled at recording start

- Mic button is **visible** (uncomment existing code)
- Shows `Mic` icon when unmuted, `MicOff` icon (red) when muted
- Clicking does two things (matching existing pattern in commented code):
  1. Sends `RECORDING.TOGGLE_MIC` message → toggles `micAudioTrack.enabled` in `video.capture.ts`
  2. Updates `recordingSettingsStorage.setMicEnabled(!micEnabled)` → keeps storage in sync with actual state

### When mic was NOT enabled at recording start

- Mic button is **not rendered** (hidden, not disabled)

### `hasAudioTrack` signal mechanism

Add `activeTrack` and `muted` boolean fields to `recordingSettingsStorage`:

```typescript
interface RecordingSettings {
  mic: {
    enabled: boolean;     // user preference for future recordings
    permission: MicPermission;
    activeTrack: boolean; // true when current recording has a mic track
    muted: boolean;       // true when mic is muted during recording (separate from enabled)
  };
}
```

- `enabled` is the user's persistent preference — toggled from the popup, persists across sessions
- `muted` is the transient mute state during recording — toggled from the toolbar, reset on recording stop
- This separation prevents toolbar mute/unmute from corrupting the user's preference for future recordings
- Set `activeTrack: true` and `muted: false` when mic stream is successfully acquired
- Set both to `false` on recording stop/cleanup
- Toolbar reads `activeTrack` to decide visibility and `muted` to show the icon state
- This avoids adding new message types — reuses the existing reactive storage pattern

## Popup Behavior

### Mic toggle button (`mic-toggle.ui.tsx`)

The `unknown` branch already opens the permission page via `chrome.tabs.create()` — preserve this. The fix is the `denied` branch which currently returns early with a `@todo`:

```
if (permission === 'granted') {
  toggle mic.enabled in storage
  return
}

if (permission === 'denied') {
  // FIX: was returning early, now opens permission page
  open mic-permission page in new tab
  return
}

// permission === 'unknown' — already works, opens permission page
```

### Mic state badge fix

The current badge in `record-video.view.tsx` reads `isMicEnabled` from `mic.enabled` only, ignoring permission state. A new user with default `mic.enabled: true` and `permission: 'unknown'` sees badge "on" even though mic won't actually record.

Fix: badge shows "on" only when `mic.enabled && mic.permission === 'granted'`. Otherwise shows "off" or no badge.

### Disable popup toggle during recording

When a recording is active, the popup mic toggle should be disabled with a tooltip: "Stop recording to change mic settings." The toolbar controls mute/unmute during recording.

## Permission Page

### Location

New page entry: `pages/mic-permission/` following the existing extension page pattern.

HTML entry: `pages/mic-permission/index.html` (same pattern as `pages/popup/index.html`). Vite builds it to `dist/mic-permission/index.html`. Opened via `chrome.tabs.create({ url: chrome.runtime.getURL('mic-permission/index.html') })`.

**Note:** Extension pages opened via `chrome.runtime.getURL()` do NOT need to be in `web_accessible_resources`. That manifest field is only for pages accessed by web content. The permission page is opened by the extension itself.

### UI

Minimal, clean page matching extension design system (`@extension/ui` components):

**On load:**
- Shows Brie logo, title "Microphone Permission"
- Automatically attempts `getUserMedia({ audio: true })`

**On success (permission granted):**
- Green checkmark, "Microphone enabled"
- Updates storage: `recordingSettingsStorage.setMicPermission('granted')`
- Auto-closes tab after 2 seconds

**On denied:**
- Red X, "Microphone access was denied"
- Step-by-step instructions:
  1. Open `chrome://settings/content/microphone`
  2. Find `chrome-extension://<id>` in blocked list
  3. Remove it
  4. Come back and click "Try again"
- "Try again" button re-attempts `getUserMedia()`
- Updates storage: `recordingSettingsStorage.setMicPermission('denied')`

**On error (unexpected):**
- "Something went wrong" message
- "Try again" button

## Files to Create

| File | Purpose |
|------|---------|
| `pages/mic-permission/index.html` | HTML entry (same pattern as popup) |
| `pages/mic-permission/src/index.tsx` | React entry point |
| `pages/mic-permission/src/MicPermission.tsx` | Permission page component |
| `pages/mic-permission/package.json` | Package config |
| `pages/mic-permission/vite.config.mts` | Build config (`.mts` extension, matching existing pages) |
| `pages/mic-permission/tsconfig.json` | TypeScript config |
| `pages/mic-permission/tailwind.config.ts` | Tailwind config (required for `@extension/ui` components) |

## Files to Modify

| File | Changes |
|------|---------|
| `pages/content/src/capture/video.capture.ts` | **Major rework.** Remove `audio` from `getDisplayMedia()` constraints (always `false`). Add `getUserMedia({ audio: true })` for mic. Add `micStream` and `micAudioTrack` module variables. Merge streams into combined `MediaStream`. Clean up mic stream on stop AND on native stream end. Update `toggleMic()` to use `micAudioTrack`. Update `buildDisplayMediaConstraints()` to remove audio parameter. |
| `pages/content-ui/src/components/recording-view/ui/toolbar.ui.tsx` | Uncomment mic button. Conditionally render based on `mic.activeTrack` from storage. |
| `pages/popup/src/components/capture/ui/mic-toggle.ui.tsx` | Fix `denied` branch to open permission page instead of returning early. Update `chrome.tabs.create()` URL to `mic-permission/index.html`. |
| `pages/popup/src/components/capture/views/record-video.view.tsx` | Fix badge logic: show "on" only when `mic.enabled && mic.permission === 'granted'`. |
| `packages/storage/lib/impl/capture/settings.storage.ts` | Add `activeTrack: boolean` to `RecordingSettings.mic`. Add `setMicActiveTrack(active: boolean)` method. Update default to `activeTrack: false`. |
| `chrome-extension/src/background/index.ts` | Add mic permission sync via `navigator.permissions.query({ name: 'microphone' })` on startup, wrapped in try/catch. |
| `chrome-extension/manifest.ts` | No `web_accessible_resources` change needed. Add mic-permission page build output if required by the build system. |

## Files Unchanged

| File | Reason |
|------|--------|
| `packages/shared/lib/constants/messages/recording.message.ts` | Already has `RECORDING.TOGGLE_MIC` |
| `pages/content/src/event-listeners/window.event-listeners.ts` | Already handles `TOGGLE_MIC` → `toggleMic()` |
| `pnpm-workspace.yaml` | Uses `'pages/*'` glob — new page auto-included |
| `turbo.json` | Generic task definitions apply to all packages |

## Edge Cases

| Scenario | Handling |
|----------|----------|
| User revokes mic via Chrome settings between sessions | Background startup sync catches this, resets storage to `denied` |
| `getUserMedia()` fails at recording start | Fallback to video-only, toast notification, update permission to `denied` |
| User closes permission page without acting | Permission stays `unknown`, next toggle re-opens page |
| Multiple tabs open | Storage is shared via Chrome Storage API, all popups see same state reactively |
| Firefox | `navigator.permissions.query({ name: 'microphone' })` may not be supported — try/catch, leave stored state unchanged |
| User toggles mic off in popup while recording | Popup toggle disabled during active recording. Mute/unmute only via toolbar. |
| Tab audio checkbox in Chrome share dialog | Irrelevant — we pass `audio: false` to `getDisplayMedia()`, only mic audio is captured |
| Default `mic.enabled: true` with `permission: unknown` | Badge shows "off" (requires both enabled + granted). No silent confusion. |
| Display stream ends natively (browser "Stop sharing" button) | `onended` handler stops mic stream tracks in addition to display stream cleanup |
| Opus codec for audio | Existing `pickMimeType()` candidates include Opus. Verify audio-capable codec is selected when mic track is present. |
