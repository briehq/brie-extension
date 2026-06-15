import { test } from '@playwright/test';

import { getExtensionId, launchExtensionContext, teardownExtensionContext } from './fixtures/extension.js';

const STORAGE_KEY = 'auth-tokens-storage-key';
const POLL_INTERVAL_MS = 1_500;

/**
 * One-time login flow. Launches Chromium against the persistent user-data-dir,
 * opens the popup so you can click "Continue" and complete the demo-account
 * OAuth, then polls chrome.storage.local for the auth tokens. Once tokens
 * appear, the session is persisted in the user-data-dir and every subsequent
 * `pnpm test:happy` / `pnpm test:video` run skips the login.
 *
 * Run with: `pnpm e2e:login`. Re-run only when the demo session expires.
 *
 * The spec body waits up to 10 minutes for the human to finish OAuth — set
 * BRIE_E2E_LOGIN_TIMEOUT_MS to bump if your provider redirects are slow.
 */
test('e2e: log into demo account and persist the session', async () => {
  test.setTimeout(0);

  const launch = await launchExtensionContext();
  const { context } = launch;

  try {
    const extensionId = await getExtensionId(context);

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup/index.html`, { waitUntil: 'domcontentloaded' });

    console.log(
      [
        '',
        '====================================================================',
        '  BRIE E2E LOGIN',
        '====================================================================',
        '  1. The popup window is open. Click "Continue" to start OAuth.',
        '  2. Sign in with the demo account credentials.',
        '  3. After redirect, leave the window open. This script will detect',
        '     the auth tokens in chrome.storage.local and exit on its own.',
        '  4. If something goes wrong, close the window manually.',
        '====================================================================',
        '',
      ].join('\n'),
    );

    const timeoutMs = Number(process.env.BRIE_E2E_LOGIN_TIMEOUT_MS ?? 10 * 60 * 1000);
    const start = Date.now();
    let tokensSeen = false;

    while (Date.now() - start < timeoutMs) {
      const probe = await context.newPage();
      try {
        await probe.goto(`chrome-extension://${extensionId}/popup/index.html`, {
          waitUntil: 'domcontentloaded',
        });
        const tokens = await probe.evaluate(async key => {
          const ext = window as unknown as {
            chrome: { storage: { local: { get: (k: string) => Promise<Record<string, unknown>> } } };
          };
          const result = await ext.chrome.storage.local.get(key);
          return result[key] ?? null;
        }, STORAGE_KEY);

        if (
          tokens &&
          typeof tokens === 'object' &&
          'accessToken' in tokens &&
          (tokens as { accessToken: string }).accessToken
        ) {
          tokensSeen = true;
          console.log('[login] Auth tokens detected in chrome.storage.local. Persisting session and exiting.');
          break;
        }
      } finally {
        await probe.close().catch(() => undefined);
      }
      await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    }

    if (!tokensSeen) {
      throw new Error(
        `Timed out after ${timeoutMs}ms waiting for the auth tokens to appear. Re-run and complete OAuth.`,
      );
    }

    console.log(`[login] User-data-dir: ${launch.userDataDir}`);
    console.log('[login] You can now run `pnpm test:happy` / `pnpm test:video` without authenticating again.');
  } finally {
    await teardownExtensionContext(launch);
  }
});
