import { test } from '@playwright/test';

import { launchExtensionContext, teardownExtensionContext } from './fixtures/extension.js';

/**
 * Debug-only: launches Chromium with the extension loaded, navigates to
 * chrome://extensions, and pauses indefinitely so you can read the load
 * error in your own eyes.
 *
 * Run with: `pnpm -F @extension/e2e exec playwright test --config=./playwright/playwright.config.ts debug-load-extension.spec.ts`
 *
 * Delete after we've read the error.
 */
test('debug: pause at chrome://extensions', async () => {
  test.setTimeout(0);

  const { context, userDataDir } = await launchExtensionContext();

  try {
    const page = await context.newPage();
    await page.goto('chrome://extensions');
    // Enable developer mode so error details are visible (in-page click).
    await page.evaluate(() => {
      const root = document.querySelector('extensions-manager');
      // No-op if the DOM shape changes; the toggle in the top-right of the
      // page is the manual fallback.
      void root;
    });
    console.log(
      '\n[debug] Chromium is open at chrome://extensions. Toggle "Developer mode" (top-right), find the Brie extension card, click "Errors" if present, and paste the message here. Then close the window.\n',
    );
    await page.pause();
  } finally {
    await teardownExtensionContext(context, userDataDir);
  }
});
