import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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

  // Chrome 130+ silently ignores --load-extension when developer mode is
  // OFF in the user profile, which is the default for a fresh user-data-dir.
  // Pre-seeding Default/Preferences with developer_mode=true bypasses the
  // toggle so the extension actually loads on first launch. Toggling it via
  // chrome://extensions after the fact doesn't retroactively load anything.
  const defaultProfileDir = join(userDataDir, 'Default');
  mkdirSync(defaultProfileDir, { recursive: true });
  writeFileSync(
    join(defaultProfileDir, 'Preferences'),
    JSON.stringify({
      extensions: { ui: { developer_mode: true } },
    }),
  );

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      // Chrome 130+ enables `DisableLoadExtensionCommandLineSwitch` by default,
      // which silently drops --load-extension. Opt out so the next two flags
      // actually take effect. Without this, the extension never gets installed
      // into the profile, the SW never spawns, and beforeAll times out.
      '--disable-features=DisableLoadExtensionCommandLineSwitch',
      `--disable-extensions-except=${EXTENSION_DIR}`,
      `--load-extension=${EXTENSION_DIR}`,
      // Fake-media flags are only needed for the video happy-path. Some
      // Chromium versions choke on --auto-select-desktop-capture-source and
      // fail the extension load with no useful error, so it's gated behind
      // BRIE_E2E_FAKE_MEDIA=1; specs that don't record video should leave
      // it unset.
      ...(process.env.BRIE_E2E_FAKE_MEDIA === '1'
        ? [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--auto-select-desktop-capture-source=Entire screen',
          ]
        : []),
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
 * hardcode the ID because Chromium derives it from the unpacked dir path
 * hash and our manifest doesn't pin a `key`.
 *
 * Under MV3, the SW often won't auto-spawn from `--load-extension` alone —
 * it stays dormant until something pings the extension (page navigation,
 * content-script injection, or a popup open). We probe-navigate to an
 * http(s) page so the content_scripts host_permissions matcher fires and
 * brings the worker up.
 */
const getExtensionId = async (context: BrowserContext, timeoutMs = 30_000): Promise<string> => {
  const start = Date.now();

  const existing = context.serviceWorkers()[0];
  if (existing) return extractIdFromUrl(existing.url());

  // Subscribe to the event BEFORE the probe page navigates, so we don't
  // miss the registration if it fires while we're between polls.
  const swEvent = new Promise<Worker>(resolveFn => {
    context.once('serviceworker', resolveFn);
  });

  // Probe page: content scripts match http(s) URLs in the manifest; visiting
  // any one of them wakes the SW. about:blank doesn't match host_permissions
  // so we use a real URL. Errors are swallowed — even a failed nav can
  // still trigger the SW.
  const probe = (async () => {
    const page = await context.newPage();
    try {
      await page
        .goto('https://example.com/', { waitUntil: 'domcontentloaded', timeout: 15_000 })
        .catch(() => undefined);
    } finally {
      await page.close().catch(() => undefined);
    }
  })();

  while (Date.now() - start < timeoutMs) {
    const worker = context.serviceWorkers()[0];
    if (worker) {
      await probe.catch(() => undefined);
      return extractIdFromUrl(worker.url());
    }
    const winner = await Promise.race([
      swEvent.then(w => ({ kind: 'event' as const, worker: w })),
      new Promise<{ kind: 'tick' }>(r => setTimeout(() => r({ kind: 'tick' }), 250)),
    ]);
    if (winner.kind === 'event') {
      await probe.catch(() => undefined);
      return extractIdFromUrl(winner.worker.url());
    }
  }

  await probe.catch(() => undefined);
  throw new Error(`Service worker did not register within ${timeoutMs}ms after probe-navigation`);
};

export { launchExtensionContext, teardownExtensionContext, getExtensionId };
