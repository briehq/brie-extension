import type { BrowserContext } from '@playwright/test';

import { getExtensionId } from './extension.js';

/**
 * Seed the auth-tokens storage so the popup renders the capture screen
 * instead of the login flow. The storage key + value shape are pinned to
 * what packages/storage/lib/impl/auth/tokens.storage.ts writes.
 *
 * Storage uses identity serialization (the base storage's default), so we
 * write the raw object rather than a JSON-encoded string.
 */
export const seedAuth = async (
  context: BrowserContext,
  tokens: { accessToken: string; refreshToken: string } = {
    accessToken: 'pw-fake-access-token',
    refreshToken: 'pw-fake-refresh-token',
  },
) => {
  const extensionId = await getExtensionId(context);

  // Use a backgrounded popup page to run chrome.storage.local.set; calling it
  // from a content-script page wouldn't have the right host_permissions.
  const page = await context.newPage();
  try {
    await page.goto(`chrome-extension://${extensionId}/popup/index.html`);
    await page.evaluate(async value => {
      // chrome namespace is provided at runtime by the extension context; cast
      // through window since this test package doesn't include @types/chrome.
      const ext = window as unknown as {
        chrome: { storage: { local: { set: (items: Record<string, unknown>) => Promise<void> } } };
      };
      await ext.chrome.storage.local.set({ 'auth-tokens-storage-key': value });
    }, tokens);
  } finally {
    await page.close();
  }
};
