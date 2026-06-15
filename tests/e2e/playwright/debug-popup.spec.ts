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
  try {
    await installMockApi(context);
    const extensionId = await getExtensionId(context);
    await ensureLoggedIn(context, extensionId);

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup/index.html`, { waitUntil: 'domcontentloaded' });
    await popup.waitForTimeout(2_000); // let React render

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
