import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';
import type { BrowserContext, Worker } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));

const EXTENSION_DIR = resolve(__dirname, '../../../../dist');

/**
 * Boots a persistent-context Chromium with the MV3 extension pre-loaded and
 * fake-media flags pre-armed. Returns the context plus its temporary
 * user-data-dir so the caller can clean up.
 *
 * `--use-fake-ui-for-media-stream` + `--use-fake-device-for-media-stream` are
 * set unconditionally so the video happy-path (Phase 2) can be added without
 * touching this loader. Screenshot-only specs ignore them.
 */
const launchExtensionContext = async (): Promise<{
  context: BrowserContext;
  userDataDir: string;
}> => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'brie-pw-happy-'));

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_DIR}`,
      `--load-extension=${EXTENSION_DIR}`,
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--auto-select-desktop-capture-source=Entire screen',
      ...(process.env.CI === 'true' ? ['--headless=new', '--no-sandbox', '--disable-gpu'] : []),
    ],
  });

  return { context, userDataDir };
};

const teardownExtensionContext = async (context: BrowserContext | undefined, userDataDir: string | undefined) => {
  await context?.close();
  if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
};

const extractIdFromUrl = (url: string): string => {
  const match = url.match(/chrome-extension:\/\/([^/]+)/);
  if (!match) throw new Error(`Could not extract extension ID from SW URL: ${url}`);
  return match[1]!;
};

/**
 * Resolves the MV3 extension's runtime ID by waiting for its background
 * service worker to register against the persistent context. Tests can't
 * hardcode the ID because Chromium derives it from the unpacked dir path.
 */
const getExtensionId = async (context: BrowserContext, timeoutMs = 10_000): Promise<string> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const worker = context.serviceWorkers()[0];
    if (worker) return extractIdFromUrl(worker.url());
    await new Promise(r => setTimeout(r, 200));
  }
  const promised = await new Promise<Worker>(resolveFn => {
    context.once('serviceworker', resolveFn);
  });
  return extractIdFromUrl(promised.url());
};

export { launchExtensionContext, teardownExtensionContext, getExtensionId };
