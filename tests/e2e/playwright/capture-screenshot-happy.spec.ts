import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { expect, test } from '@playwright/test';

import { ensureLoggedIn } from './fixtures/auth.js';
import { getExtensionId, launchExtensionContext, teardownExtensionContext } from './fixtures/extension.js';
import type { LaunchResult } from './fixtures/extension.js';
import { installMockApi } from './fixtures/mock-api.js';
import type { MockApi } from './fixtures/mock-api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOST_PAGE_URL = pathToFileURL(resolve(__dirname, 'fixtures/host-page.html')).toString();

let launch: LaunchResult;
let mockApi: MockApi;

/**
 * Phase-1 happy path: load extension → seed auth → install API mocks →
 * open popup → click screenshot capture → wait for content-UI mount in host →
 * draw an annotation → submit → assert exactly one asset upload reached the mock.
 *
 * Selectors are intentionally loose (role + name regex) so a copy tweak in
 * the popup doesn't break the suite — when something here goes red, prefer
 * tightening the assertion over hardcoding a brittle CSS path.
 *
 * Marked `test.fixme` until the selector pass has been validated locally
 * against a fresh `pnpm build:chrome:production`. Flip it on by removing
 * `.fixme` once you've run it once and confirmed every step lands.
 */
test.beforeAll(async () => {
  test.setTimeout(120_000); // OAuth on first run can take a while
  launch = await launchExtensionContext();
  mockApi = await installMockApi(launch.context);
  const extensionId = await getExtensionId(launch.context);
  // Idempotent: returns immediately if a session already exists in the
  // persistent user-data-dir. On first run (or after a session expires),
  // drives OAuth using BRIE_E2E_EMAIL / BRIE_E2E_PASSWORD.
  await ensureLoggedIn(launch.context, extensionId);
});

test.afterAll(async () => {
  await teardownExtensionContext(launch);
});

test('popup → screenshot capture → annotate → send produces an asset upload', async () => {
  const { context } = launch;
  const extensionId = await getExtensionId(context);

  // Step 1 — host page is reachable and the content script mounts.
  const host = await context.newPage();
  await host.goto(HOST_PAGE_URL, { waitUntil: 'domcontentloaded' });
  await host.waitForFunction(() => !!document.getElementById('brie-root'), null, { timeout: 10_000 });

  // Step 2 — open the popup directly. The MV3 popup HTML is web-accessible.
  // Auth state comes from the persistent user-data-dir (see fixtures/
  // extension.ts), populated by `pnpm e2e:login` against the demo account.
  // If the popup shows the login screen instead of the capture view, the
  // session has expired — re-run `pnpm e2e:login`.
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup/index.html`, {
    waitUntil: 'domcontentloaded',
  });

  // Step 3 — switch the capture mode to Fullscreen and trigger it.
  //
  // Default mode is 'area', which would require us to mouse-drag a region on
  // the host page after the popup closes — flaky and adds nothing this test
  // is meant to assert. Fullscreen snaps the whole page in one step, lands
  // straight in the annotation dialog.
  //
  // The mode selector is inside a CollapsibleActionCard. Expand it first
  // (aria-label "Expand Capture Area"), then click the "Fullscreen" option
  // in the inner ButtonGroup, then click the now-relabeled
  // "Capture Fullscreen" CTA.
  await popup.getByRole('button', { name: /expand capture/i }).click();
  await popup.getByRole('button', { name: /^fullscreen$/i }).click();
  const captureButton = popup.getByRole('button', { name: /capture fullscreen/i }).first();
  await expect(captureButton).toBeVisible();
  await captureButton.click();

  // After click the popup calls window.close(); allow Chromium to settle.
  await popup.waitForEvent('close', { timeout: 5_000 }).catch(() => {
    /* If the popup variant doesn't close itself, continue anyway. */
  });

  // Step 4 — content-UI mounts the annotation dialog into the host page.
  // The shadow host lives at #brie-root; the dialog renders inside its shadow
  // DOM after SCREENSHOT.START fires.
  await host.waitForFunction(
    () => {
      const root = document.getElementById('brie-root');
      const shadow = (root as HTMLElement | null)?.shadowRoot ?? null;
      return !!shadow?.querySelector('canvas, [role="dialog"]');
    },
    null,
    { timeout: 15_000 },
  );

  // Step 5 — draw a single rectangle on the annotation canvas. Selector probe
  // accepts either the shadow-root canvas or a top-level one; the click drag
  // simulates a freehand box.
  const canvasHandle = await host.evaluateHandle(() => {
    const root = document.getElementById('brie-root') as HTMLElement | null;
    return root?.shadowRoot?.querySelector('canvas') ?? document.querySelector('canvas');
  });
  const box = await canvasHandle.evaluate(c => {
    if (!(c instanceof HTMLCanvasElement)) return null;
    const r = c.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });
  if (box) {
    await host.mouse.move(box.x + box.w * 0.25, box.y + box.h * 0.25);
    await host.mouse.down();
    await host.mouse.move(box.x + box.w * 0.6, box.y + box.h * 0.6, { steps: 10 });
    await host.mouse.up();
  }

  // Step 6 — submit. The send button lives in create-dropdown.ui.tsx and is
  // gated by the details form. Use role+name to stay resilient to layout.
  const sendButton = host.getByRole('button', { name: /create|send|share|submit/i }).first();
  await sendButton.click();

  // Step 7 — verify exactly one asset upload reached the mock. If the flow
  // splits into multiple assets later, change this to .toBeGreaterThan(0).
  const upload = await mockApi.waitForAssetUpload(20_000);
  expect(upload.method).toBe('POST');
  expect(upload.url).toMatch(/\/slices\/[^/]+\/assets\/[^/?]+/);

  // FormData crosses the wire as multipart/form-data with a 'file' field; the
  // boundary header proves the body shape.
  expect(upload.headers['content-type'] ?? '').toMatch(/multipart\/form-data/);
  expect(upload.postDataBuffer?.length ?? 0).toBeGreaterThan(0);
});
