import { defineConfig } from '@playwright/test';

/**
 * MV3 extensions require persistent-context Chromium, which doesn't compose with Playwright's
 * standard `page` fixture — each spec creates its own context. `workers: 1` because concurrent
 * persistent contexts conflict on the same user-data-dir path.
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
