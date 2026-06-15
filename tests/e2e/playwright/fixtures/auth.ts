import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BrowserContext, Page } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ENV_FILE = resolve(__dirname, '../../.env.test.local');
const STORAGE_KEY = 'auth-tokens-storage-key';
const AUTH_FLOW_STORAGE_KEY = 'auth-flow-storage-key';
const POLL_INTERVAL_MS = 1_000;
const POPUP_OAUTH_TIMEOUT_MS = 30_000;

type EnvVars = { email?: string; password?: string };

const loadCreds = (): EnvVars => {
  const fromProcess = {
    email: process.env.BRIE_E2E_EMAIL,
    password: process.env.BRIE_E2E_PASSWORD,
  };
  if (fromProcess.email && fromProcess.password) return fromProcess;

  // Tiny ad-hoc parser so this fixture doesn't need a `dotenv` dependency.
  // Format: KEY=value lines, # comments, blank lines. Quotes are stripped.
  if (!existsSync(ENV_FILE)) return fromProcess;
  const out: Record<string, string> = {};
  for (const raw of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return {
    email: out.BRIE_E2E_EMAIL ?? fromProcess.email,
    password: out.BRIE_E2E_PASSWORD ?? fromProcess.password,
  };
};

const readTokens = async (context: BrowserContext, extensionId: string): Promise<unknown> => {
  const probe = await context.newPage();
  try {
    await probe.goto(`chrome-extension://${extensionId}/popup/index.html`, { waitUntil: 'domcontentloaded' });
    return await probe.evaluate(async key => {
      const ext = window as unknown as {
        chrome: { storage: { local: { get: (k: string) => Promise<Record<string, unknown>> } } };
      };
      const result = await ext.chrome.storage.local.get(key);
      return result[key] ?? null;
    }, STORAGE_KEY);
  } finally {
    await probe.close().catch(() => undefined);
  }
};

/**
 * The popup's Continue button is gated by `authIdentityProviderStorage.active`
 * (see pages/popup/src/hooks/use-auth-identity-provider.hook.ts). When OAuth
 * starts, that flag is set to true and only cleared in a finally block. If a
 * previous run crashed mid-flow, the flag stays stuck in the persistent
 * user-data-dir and disables Continue on every subsequent run. Clearing the
 * key before each login attempt is the only safe way to recover.
 */
const resetAuthFlowFlag = async (context: BrowserContext, extensionId: string): Promise<void> => {
  const probe = await context.newPage();
  try {
    await probe.goto(`chrome-extension://${extensionId}/popup/index.html`, { waitUntil: 'domcontentloaded' });
    await probe.evaluate(async key => {
      const ext = window as unknown as {
        chrome: { storage: { local: { remove: (k: string) => Promise<void> } } };
      };
      await ext.chrome.storage.local.remove(key);
    }, AUTH_FLOW_STORAGE_KEY);
  } finally {
    await probe.close().catch(() => undefined);
  }
};

const tokensLookValid = (tokens: unknown): boolean =>
  !!tokens &&
  typeof tokens === 'object' &&
  'accessToken' in (tokens as object) &&
  !!(tokens as { accessToken?: string }).accessToken;

/**
 * Drives the popup → OAuth login flow with credentials from env. Selectors
 * are deliberately permissive (multi-strategy) because we don't know which
 * provider this build authenticates against; if all strategies fail, the
 * caller falls back to manual mode.
 */
const SELECTOR_WAIT_MS = 5_000;

const dumpDebugScreenshot = async (page: Page, label: string): Promise<void> => {
  const path = resolve(__dirname, `../auth-debug-${label}.png`);
  await page.screenshot({ path, fullPage: true }).catch(() => undefined);
  console.log(`[auth] saved debug screenshot: ${path}`);
};

const fillOAuthForm = async (page: Page, email: string, password: string): Promise<void> => {
  // Step 0 — Brie's auth page presents a method-selector screen first
  // ("Use e-mail address" alongside GitHub/Google/phone options). Match
  // the wording loosely so a copy tweak doesn't break the helper.
  const emailMethodPattern = /(use|continue with|sign in with).*e[-]?mail/i;
  const methodButton = page
    .getByRole('button', { name: emailMethodPattern })
    .or(page.getByRole('link', { name: emailMethodPattern }))
    .first();
  if (await methodButton.isVisible({ timeout: SELECTOR_WAIT_MS }).catch(() => false)) {
    await methodButton.click();
  }

  // Step 1 — fill the email field.
  const emailField = page
    .locator('input[type="email"], input[name="email" i], input#email, input[autocomplete="email"]')
    .first();
  try {
    await emailField.waitFor({ state: 'visible', timeout: POPUP_OAUTH_TIMEOUT_MS });
  } catch (err) {
    await dumpDebugScreenshot(page, 'no-email-field');
    throw err;
  }
  await emailField.fill(email);

  // Step 2 — some providers split email + password across two screens
  // (Google-style). Click "Next"/"Continue" if one is visible.
  const nextButton = page.getByRole('button', { name: /next|continue/i }).first();
  if (await nextButton.isVisible({ timeout: SELECTOR_WAIT_MS }).catch(() => false)) {
    await nextButton.click();
  }

  // Step 3 — fill the password field.
  const passwordField = page.locator('input[type="password"]').first();
  try {
    await passwordField.waitFor({ state: 'visible', timeout: POPUP_OAUTH_TIMEOUT_MS });
  } catch (err) {
    await dumpDebugScreenshot(page, 'no-password-field');
    throw err;
  }
  await passwordField.fill(password);

  // Step 4 — submit.
  const submitButton = page.getByRole('button', { name: /sign in|log in|continue|submit|next/i }).first();
  await submitButton.click();
};

/**
 * Returns once chrome.storage.local has a non-empty accessToken. If tokens
 * are already present, returns immediately. Otherwise drives the OAuth
 * login using credentials from BRIE_E2E_EMAIL / BRIE_E2E_PASSWORD
 * (process.env or `tests/e2e/.env.test.local`).
 *
 * Throws with actionable guidance if creds are missing and no session
 * exists yet — that's the only manual step in the whole pipeline.
 */
const ensureLoggedIn = async (context: BrowserContext, extensionId: string): Promise<void> => {
  if (tokensLookValid(await readTokens(context, extensionId))) return;

  const { email, password } = loadCreds();
  if (!email || !password) {
    throw new Error(
      [
        '',
        'No persisted session and no demo credentials found.',
        '',
        'Add BRIE_E2E_EMAIL and BRIE_E2E_PASSWORD to tests/e2e/.env.test.local',
        '(or export them in your shell), then re-run. The file is gitignored.',
        '',
        'Or run a one-off manual login: `pnpm e2e:login`.',
        '',
      ].join('\n'),
    );
  }

  // Clear any stale auth-flow flag so the popup's Continue button starts
  // enabled. Without this, a crashed previous run can permanently stick the
  // popup in the "OAuth is in progress" loading state.
  await resetAuthFlowFlag(context, extensionId);

  // Open the popup. Continue here is a single button that kicks off
  // chrome.identity's OAuth flow — there's no email input on the popup.
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup/index.html`, { waitUntil: 'domcontentloaded' });

  // Wait for Continue to become enabled. If we skip this, the click can
  // race with the React state update that toggles `disabled=false`.
  const continueButton = popup.getByRole('button', { name: /continue|sign in|log in/i }).first();
  try {
    await continueButton.waitFor({ state: 'visible', timeout: POPUP_OAUTH_TIMEOUT_MS });
    await popup.waitForFunction(
      el => el instanceof HTMLButtonElement && !el.disabled,
      await continueButton.elementHandle(),
      { timeout: POPUP_OAUTH_TIMEOUT_MS },
    );
  } catch (err) {
    await dumpDebugScreenshot(popup, 'continue-disabled');
    throw err;
  }

  // Capture every new page the click produces, even ones that close
  // immediately. Then we can pick whichever looks like the OAuth provider.
  const newPages: Page[] = [];
  const pageListener = (page: Page) => {
    newPages.push(page);
    console.log(`[auth] new page opened: ${page.url() || '(no url yet)'}`);
  };
  context.on('page', pageListener);

  await dumpDebugScreenshot(popup, 'before-continue');
  await continueButton.click();
  console.log('[auth] clicked Continue');

  // Give the click time to (a) close the popup, (b) open a new tab, or (c)
  // navigate the popup itself. Poll across all three scenarios.
  let oauthPage: Page | null = null;
  const waitStart = Date.now();
  while (Date.now() - waitStart < POPUP_OAUTH_TIMEOUT_MS) {
    // Scenario A: new tab opened with OAuth provider.
    const candidate = newPages.find(p => {
      const url = p.url();
      return url && !url.startsWith('chrome-extension://') && !url.startsWith('about:');
    });
    if (candidate) {
      oauthPage = candidate;
      break;
    }
    // Scenario B: the popup itself navigated to the provider.
    if (!popup.isClosed() && popup.url() && !popup.url().startsWith('chrome-extension://')) {
      oauthPage = popup;
      break;
    }
    await new Promise(r => setTimeout(r, 250));
  }
  context.off('page', pageListener);

  if (!oauthPage) {
    await dumpDebugScreenshot(popup.isClosed() ? (newPages[0] ?? popup) : popup, 'after-continue');
    console.log(
      `[auth] no OAuth page detected. open pages: ${context
        .pages()
        .map(p => p.url())
        .join(', ')}`,
    );
    throw new Error('Continue was clicked but no OAuth page appeared within the timeout.');
  }

  console.log(`[auth] OAuth page detected: ${oauthPage.url()}`);
  await oauthPage.waitForLoadState('domcontentloaded');
  await fillOAuthForm(oauthPage, email, password);

  // After submit, the provider redirects to the extension's callback URL,
  // chrome.identity captures the result, the SW writes tokens to storage,
  // and the popup transitions to the capture view. Poll until storage
  // confirms or we time out.
  const start = Date.now();
  while (Date.now() - start < POPUP_OAUTH_TIMEOUT_MS) {
    if (tokensLookValid(await readTokens(context, extensionId))) {
      await popup.close().catch(() => undefined);
      await oauthPage.close().catch(() => undefined);
      return;
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error('OAuth submitted but the auth tokens never appeared in chrome.storage.local within 30s.');
};

export { ensureLoggedIn, readTokens, tokensLookValid };
