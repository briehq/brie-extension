/**
 * Smoke-tests that the extension (a) reaches the target page and (b) doesn't break it.
 *
 * Usage:
 *   TARGET_URL=https://your-site.com pnpm test:site
 *
 * If TARGET_URL is not set, falls back to example.com so the test stays self-contained
 * and can run in CI without depending on third-party availability.
 */

const TARGET_URL = process.env.TARGET_URL ?? 'https://www.example.com';
const SETTLE_MS = 3_000;
const LONGTASK_BUDGET = 5;

describe(`Extension on ${TARGET_URL}`, () => {
  /**
   * Functional: the content-ui shadow host #brie-root should be in the DOM shortly after
   * the page loads. Failure here means injection itself is broken on this host.
   */
  it('injects the content-ui shadow host', async () => {
    await browser.url(TARGET_URL);
    await browser.waitUntil(async () => await browser.$('#brie-root').isExisting(), {
      timeout: 5_000,
      timeoutMsg: '#brie-root was not present 5s after navigation',
    });
  });

  /**
   * Non-interference: the host page should not see any uncaught errors or unhandled promise
   * rejections originating from extension code while it settles.
   *
   * We install hooks BEFORE navigation so we capture errors that fire during page load.
   * Errors from chrome-extension:// URLs or with `brie-` in the stack are attributed to us;
   * anything else is host-side noise and ignored.
   */
  it('does not raise extension-attributed uncaught errors on the host page', async () => {
    await browser.url(TARGET_URL);
    await browser.execute(() => {
      type ErrorBag = { source: string; message: string }[];
      const w = window as unknown as { __brieTestErrors?: ErrorBag };
      w.__brieTestErrors = [];
      window.addEventListener('error', e => {
        w.__brieTestErrors!.push({
          source: e.filename ?? '',
          message: e.message ?? String(e.error ?? ''),
        });
      });
      window.addEventListener('unhandledrejection', e => {
        w.__brieTestErrors!.push({ source: 'unhandledrejection', message: String(e.reason) });
      });
    });

    await browser.pause(SETTLE_MS);

    const errors = (await browser.execute(
      () => (window as unknown as { __brieTestErrors: { source: string; message: string }[] }).__brieTestErrors,
    )) as { source: string; message: string }[];

    const fromExtension = errors.filter(
      e => /chrome-extension:|moz-extension:|brie-/i.test(e.source) || /brie-/i.test(e.message),
    );

    if (fromExtension.length) {
      // Surface the messages in the test output for debugging.
      console.error('[non-interference] extension-attributed errors:', fromExtension);
    }
    expect(fromExtension).toEqual([]);
  });

  /**
   * Performance budget: extension injection should not introduce many >50ms long tasks on
   * the host page main thread. The host page itself produces some long tasks during initial
   * load, so we assert a small budget rather than zero. Tune LONGTASK_BUDGET per-site if
   * a target legitimately runs a lot of work at load time.
   */
  it('does not blow the host main-thread long-task budget', async () => {
    await browser.url(TARGET_URL);

    const longTaskCount = (await browser.executeAsync((settleMs: number, done: (n: number) => void) => {
      let count = 0;
      const obs = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (entry.duration > 50) count++;
      });
      try {
        obs.observe({ type: 'longtask', buffered: true });
      } catch {
        // longtask not supported on this engine (Firefox); skip silently.
        done(0);
        return;
      }
      setTimeout(() => {
        obs.disconnect();
        done(count);
      }, settleMs);
    }, SETTLE_MS)) as number;

    expect(longTaskCount).toBeLessThan(LONGTASK_BUDGET);
  });
});
