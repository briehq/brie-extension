import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { expect, test } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';

import { seedAuth } from './fixtures/auth.js';
import { getExtensionId, launchExtensionContext, teardownExtensionContext } from './fixtures/extension.js';
import { installMockApi } from './fixtures/mock-api.js';
import type { MockApi } from './fixtures/mock-api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOST_PAGE_URL = pathToFileURL(resolve(__dirname, 'fixtures/host-page.html')).toString();

let context: BrowserContext;
let userDataDir: string;
let mockApi: MockApi;

/**
 * Phase-2 happy path: load extension → seed auth → install API mocks → open
 * popup → click the record CTA → wait while the fake media source records →
 * click stop in the content-ui toolbar → submit → assert an asset upload
 * reached the mock.
 *
 * Relies on the same fixtures as Phase 1; the extension loader already sets
 * `--use-fake-ui-for-media-stream`, `--use-fake-device-for-media-stream`, and
 * `--auto-select-desktop-capture-source=Entire screen`, so getDisplayMedia
 * resolves without a real picker. The fake source produces a synthetic green
 * frame which is enough to exercise MediaRecorder + the WebM codec path.
 *
 * Marked `test.fixme` for the same reason as the screenshot spec: the
 * popup→toolbar→send selectors haven't been validated locally yet. Most
 * likely failure points if you flip it on:
 *   1. getDisplayMedia rejected — verify the fake-ui flag is reaching the
 *      service worker (check `chrome://policy` / launch args).
 *   2. Stop button selector — the toolbar mounts inside #brie-root's shadow
 *      DOM; if `t('stopAndSave')` localises differently in your build, swap
 *      the regex.
 *   3. FFmpeg WASM load (lazy on submit) — bump the asset-upload timeout if
 *      the first run takes more than 30s while the wasm bytes prefetch.
 */
test.beforeAll(async () => {
  const launched = await launchExtensionContext();
  context = launched.context;
  userDataDir = launched.userDataDir;

  mockApi = await installMockApi(context);
  await seedAuth(context);
});

test.afterAll(async () => {
  await teardownExtensionContext(context, userDataDir);
});

test.fixme('popup → video record → stop → send produces an asset upload', async () => {
  const extensionId = await getExtensionId(context);

  // Step 1 — host page reachable, content script mounts.
  const host = await context.newPage();
  await host.goto(HOST_PAGE_URL, { waitUntil: 'domcontentloaded' });
  await host.waitForFunction(() => !!document.getElementById('brie-root'), null, { timeout: 10_000 });

  // Step 2 — open the popup. RecordVideoView lives next to the screenshot
  // view; clicking the primary CTA fires RECORDING.START.
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup/index.html`, {
    waitUntil: 'domcontentloaded',
  });

  // Step 3 — click the record CTA. The button's aria-label is
  // `t('startAction', title)` where title is RECORD_TITLE[mode] ("Record
  // Tab" or "Record Desktop"); a /record/i regex matches either.
  const recordButton = popup.getByRole('button', { name: /record/i }).first();
  await expect(recordButton).toBeVisible();
  await recordButton.click();

  // Popup closes itself after dispatching RECORDING.START.
  await popup.waitForEvent('close', { timeout: 5_000 }).catch(() => {
    /* Some popup variants stay open; continue either way. */
  });

  // Step 4 — recording is now underway. Wait a beat so the MediaRecorder
  // emits at least one chunk; the trim-util enforces a 50ms minimum, so
  // 2s gives a clear, non-flaky margin.
  await host.waitForTimeout(2_000);

  // Step 5 — find the toolbar stop button in the content-ui shadow DOM.
  // toolbar.ui.tsx renders it when state ∈ {capturing, paused}; the
  // tooltip uses `t('stopAndSave')`. Probe both the shadow root and the
  // light DOM in case the shadow boundary shifts in the future.
  const stopButton = await host.evaluateHandle(() => {
    const root = document.getElementById('brie-root') as HTMLElement | null;
    const candidates = [root?.shadowRoot, document] as const;
    for (const scope of candidates) {
      if (!scope) continue;
      const found = (scope as Document | ShadowRoot).querySelector(
        'button[aria-label*="top" i], button[aria-label*="ave" i]',
      );
      if (found instanceof HTMLButtonElement) return found;
    }
    return null;
  });
  const stopHandle = stopButton.asElement();
  if (!stopHandle) throw new Error('Stop button not found in host shadow DOM');
  await stopHandle.click();

  // Step 6 — wait for the dialog to mount with the video preview. Same
  // shadow-root probe as Phase 1; content-ui's RecordingOverlay renders a
  // <video> once VIDEO.CAPTURED fires.
  await host.waitForFunction(
    () => {
      const root = document.getElementById('brie-root') as HTMLElement | null;
      const shadow = root?.shadowRoot ?? null;
      return !!shadow?.querySelector('video, [role="dialog"]');
    },
    null,
    { timeout: 20_000 },
  );

  // Step 7 — submit. Same create-dropdown button as the screenshot path.
  // FFmpeg WASM loads lazily here; the asset-upload wait below absorbs it.
  const sendButton = host.getByRole('button', { name: /create|send|share|submit/i }).first();
  await sendButton.click();

  // Step 8 — verify at least one asset upload reached the mock. Video runs
  // multiple uploads in parallel (video + records + events), so we don't
  // pin a single one. We DO verify the body is multipart, proving the
  // FormData flow ran end-to-end including FFmpeg trim.
  const upload = await mockApi.waitForAssetUpload(30_000);
  expect(upload.method).toBe('POST');
  expect(upload.url).toMatch(/\/slices\/[^/]+\/assets\/[^/?]+/);
  expect(upload.headers['content-type'] ?? '').toMatch(/multipart\/form-data/);
  expect(upload.postDataBuffer?.length ?? 0).toBeGreaterThan(0);

  // Sanity: at least one of the uploads should be non-trivially sized
  // (>1KB) — a smaller body would mean we shipped an empty placeholder
  // instead of an actual encoded video chunk.
  const uploads = mockApi.assetUploads();
  expect(uploads.some(u => (u.postDataBuffer?.length ?? 0) > 1024)).toBe(true);
});
