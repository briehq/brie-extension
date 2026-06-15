import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { test } from '@playwright/test';

import { ensureLoggedIn } from './fixtures/auth.js';
import { getExtensionId, launchExtensionContext, teardownExtensionContext } from './fixtures/extension.js';
import { installMockApi } from './fixtures/mock-api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Debug-only: opens the popup with seeded auth, dumps every button label +
 * aria-label visible at first paint, takes a screenshot. Use this to figure
 * out what the screenshot CTA actually looks like so capture-screenshot-
 * happy.spec.ts can target it.
 */
test('debug: dump popup view + buttons', async () => {
  test.setTimeout(120_000);

  const launch = await launchExtensionContext();
  const { context } = launch;

  // Capture every API request the popup makes so we can see whether the
  // mocks fired or whether something hit the real network.
  const apiRequests: Array<{ method: string; url: string; status?: number }> = [];
  context.on('request', req => {
    if (!req.url().includes('briehq') && !req.url().includes('/api/')) return;
    apiRequests.push({ method: req.method(), url: req.url() });
  });
  context.on('response', async res => {
    const entry = apiRequests.find(r => r.url === res.url() && r.status === undefined);
    if (entry) entry.status = res.status();
  });

  try {
    await installMockApi(context);
    const extensionId = await getExtensionId(context);
    await ensureLoggedIn(context, extensionId);

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup/index.html`, { waitUntil: 'domcontentloaded' });
    await popup.waitForTimeout(3_000); // let React render + run effects

    // What's actually in chrome.storage.local?
    const storageDump = await popup.evaluate(async () => {
      const ext = window as unknown as {
        chrome: { storage: { local: { get: (k: null) => Promise<Record<string, unknown>> } } };
      };
      return await ext.chrome.storage.local.get(null);
    });
    console.log('\n=== chrome.storage.local ===');
    console.log(JSON.stringify(storageDump, null, 2));

    console.log('\n=== API REQUESTS ===');
    if (apiRequests.length === 0) console.log('  (none)');
    apiRequests.forEach(r => console.log(`  - ${r.method} ${r.url} → ${r.status ?? 'pending'}`));

    const screenshotPath = resolve(__dirname, 'debug-popup.png');
    await popup.screenshot({ path: screenshotPath, fullPage: true });

    const buttons = await popup.evaluate(() => {
      const out: Array<Record<string, string | null>> = [];
      document.querySelectorAll('button, [role="button"]').forEach(el => {
        out.push({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent ?? '').trim().slice(0, 80),
          ariaLabel: el.getAttribute('aria-label'),
          role: el.getAttribute('role'),
          dataTestid: el.getAttribute('data-testid'),
        });
      });
      return out;
    });

    const headings = await popup.evaluate(() =>
      Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => (h.textContent ?? '').trim()),
    );

    console.log('\n=== POPUP HEADINGS ===');
    headings.forEach(h => console.log(`  - ${h}`));
    console.log('\n=== POPUP BUTTONS ===');
    buttons.forEach(b => {
      console.log(`  - tag=${b.tag} text="${b.text}" ariaLabel="${b.ariaLabel ?? ''}" testid="${b.dataTestid ?? ''}"`);
    });
    console.log(`\n=== SCREENSHOT saved to: ${screenshotPath} ===\n`);
  } finally {
    await teardownExtensionContext(launch);
  }
});
