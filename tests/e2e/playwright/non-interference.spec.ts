import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium, expect, test } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Chromium only — Firefox's `firefox.launchPersistentContext` does not support `--load-extension`;
 * Firefox extension testing needs web-ext / Marionette and is intentionally not wired into this spec.
 *
 * Usage: TARGET_URL=https://your-site.com pnpm test:site (defaults to example.com).
 */

const TARGET_URL = process.env.TARGET_URL ?? 'https://www.example.com';
const SETTLE_MS = 4_000;
const LONGTASK_BUDGET = 6;
const EXTENSION_DIR = resolve(__dirname, '../../../dist');

type ErrorEntry = { source: string; message: string };

declare global {
  interface Window {
    __brieTestErrors: ErrorEntry[];
  }
}

let context: BrowserContext;
let userDataDir: string;

test.beforeAll(async () => {
  userDataDir = mkdtempSync(join(tmpdir(), 'brie-pw-'));
  context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // MV3 extensions don't load in old headless; use --headless=new via CI flag below
    args: [
      `--disable-extensions-except=${EXTENSION_DIR}`,
      `--load-extension=${EXTENSION_DIR}`,
      ...(process.env.CI === 'true' ? ['--headless=new', '--no-sandbox', '--disable-gpu'] : []),
    ],
  });
});

test.afterAll(async () => {
  await context?.close();
  if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
});

test(`extension reaches ${TARGET_URL}`, async () => {
  const page = await context.newPage();
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  // content-ui injects via document_idle; allow the SPA to settle, then wait for #brie-root.
  await page.waitForFunction(() => !!document.getElementById('brie-root'), null, { timeout: 10_000 });
  expect(await page.locator('#brie-root').count()).toBeGreaterThan(0);
});

test(`no extension-attributed uncaught errors on ${TARGET_URL}`, async () => {
  const page = await context.newPage();

  // Install error capture before navigation so we catch errors fired during page load.
  await page.addInitScript(() => {
    window.__brieTestErrors = [];
    window.addEventListener('error', e => {
      window.__brieTestErrors.push({
        source: e.filename ?? '',
        message: e.message ?? String(e.error ?? ''),
      });
    });
    window.addEventListener('unhandledrejection', e => {
      window.__brieTestErrors.push({ source: 'unhandledrejection', message: String(e.reason) });
    });
  });

  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(SETTLE_MS);

  const errors: ErrorEntry[] = await page.evaluate(() => window.__brieTestErrors ?? []);
  const fromExtension = errors.filter(
    e => /chrome-extension:|moz-extension:|brie-/i.test(e.source) || /brie-/i.test(e.message),
  );

  if (fromExtension.length) {
    console.error('[non-interference] extension-attributed errors:', fromExtension);
  }
  expect(fromExtension).toEqual([]);
});

test(`stays within host long-task budget on ${TARGET_URL}`, async () => {
  const page = await context.newPage();
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

  const longTaskCount: number = await page.evaluate(
    settleMs =>
      new Promise<number>(resolve => {
        let count = 0;
        let obs: PerformanceObserver | null = null;
        try {
          obs = new PerformanceObserver(list => {
            for (const entry of list.getEntries()) if (entry.duration > 50) count++;
          });
          obs.observe({ type: 'longtask', buffered: true });
        } catch {
          // longtask unsupported on this engine; treat as 0.
          resolve(0);
          return;
        }
        setTimeout(() => {
          obs?.disconnect();
          resolve(count);
        }, settleMs);
      }),
    SETTLE_MS,
  );

  console.log(`[non-interference] long tasks on ${TARGET_URL}: ${longTaskCount} (budget ${LONGTASK_BUDGET})`);
  expect(longTaskCount).toBeLessThan(LONGTASK_BUDGET);
});
