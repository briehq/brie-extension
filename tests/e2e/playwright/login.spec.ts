import { test } from '@playwright/test';

import { ensureLoggedIn } from './fixtures/auth.js';
import { getExtensionId, launchExtensionContext, teardownExtensionContext } from './fixtures/extension.js';

/**
 * Optional convenience: run the OAuth login by itself, without firing
 * the full happy-path spec. Useful for the very first setup, or when you
 * want to confirm credentials work before running the suite.
 *
 * Identical to what `pnpm test:happy` does in its beforeAll. You don't
 * need to call this — happy specs auto-login if the persistent session
 * is missing.
 */
test('e2e: log into demo account and persist the session', async () => {
  test.setTimeout(0);

  const launch = await launchExtensionContext();
  try {
    const extensionId = await getExtensionId(launch.context);
    await ensureLoggedIn(launch.context, extensionId);
    console.log('[login] Auth tokens persisted in tests/e2e/.userdata/. test:happy / test:video will reuse them.');
  } finally {
    await teardownExtensionContext(launch);
  }
});
