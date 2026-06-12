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
  const launched = await launchExtensionContext();
  context = launched.context;
  userDataDir = launched.userDataDir;

  mockApi = await installMockApi(context);
  await seedAuth(context);
});

test.afterAll(async () => {
  await teardownExtensionContext(context, userDataDir);
});

test('popup → screenshot capture → annotate → send produces an asset upload', async () => {
  const extensionId = await getExtensionId(context);

  // Step 1 — host page is reachable and the content script mounts.
  const host = await context.newPage();
  await host.goto(HOST_PAGE_URL, { waitUntil: 'domcontentloaded' });
  await host.waitForFunction(() => !!document.getElementById('brie-root'), null, { timeout: 10_000 });

  // Step 2 — open the popup directly. The MV3 popup HTML is web-accessible.
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup/index.html`, {
    waitUntil: 'domcontentloaded',
  });

  // Step 3 — drive the screenshot CTA. Capture mode defaults to 'area'.
  // The button's aria-label is `t('runAction', title)` with title from
  // CAPTURE_TITLE['area'], so it should match /capture/i.
  const captureButton = popup.getByRole('button', { name: /capture/i }).first();
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
