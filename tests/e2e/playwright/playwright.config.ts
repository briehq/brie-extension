import { defineConfig } from '@playwright/test';

/**
 * Playwright config focused on extension-injection tests.
 *
 * MV3 extensions require persistent-context Chromium, which doesn't compose with Playwright's
 * standard `page` fixture — each spec creates its own context. Workers are forced to 1 so a
 * single shared user-data-dir is used per run (concurrent persistent contexts conflict on the
 * same profile path).
 */
export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts$/,
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    actionTimeout: 10_000,
  },
});
