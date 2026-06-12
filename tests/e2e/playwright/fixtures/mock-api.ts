import type { BrowserContext, Route } from '@playwright/test';

type RecordedRequest = {
  method: string;
  url: string;
  postDataBuffer: Buffer | null;
  headers: Record<string, string>;
  matchedRoute: 'draft' | 'asset' | 'auth-refresh' | 'other';
};

type MockApi = {
  /** Every request that hit a mocked route, in order. */
  requests: () => RecordedRequest[];
  /** Asset-upload requests only — what the "send report" flow produces. */
  assetUploads: () => RecordedRequest[];
  /** True once at least one asset upload has been observed. */
  waitForAssetUpload: (timeoutMs?: number) => Promise<RecordedRequest>;
};

const draftPattern = /\/slices\/draft\/?(?:\?|$)/;
const assetPattern = /\/slices\/[^/]+\/assets\/[^/?]+(?:\?|$)/;
const refreshPattern = /\/auth\/refresh\/?(?:\?|$)/;

/**
 * Intercepts the three API endpoints the capture-send flow touches:
 *  - POST /slices/draft        — returns a stub sliceId + asset placeholder
 *  - POST /slices/{id}/assets/{aid} — accepts FormData, returns 200
 *  - POST /auth/refresh        — in case the seeded fake tokens hit the
 *    pre-emptive refresh path
 *
 * Routes are installed at context-level so both the popup page and any host
 * page (where content-ui's fetches originate) inherit them. RTK Query fires
 * from the page realm in both cases, which is what page.route can see.
 *
 * We DON'T route everything — only the patterns above — so any other request
 * fails loudly if the flow ever depends on a new endpoint.
 */
const installMockApi = async (context: BrowserContext): Promise<MockApi> => {
  const recorded: RecordedRequest[] = [];

  const stubSliceId = 'pw-stub-slice-id';
  const stubAssetId = 'pw-stub-asset-id';

  const record = (route: Route, kind: RecordedRequest['matchedRoute']) => {
    const request = route.request();
    recorded.push({
      method: request.method(),
      url: request.url(),
      postDataBuffer: request.postDataBuffer(),
      headers: request.headers(),
      matchedRoute: kind,
    });
  };

  await context.route(draftPattern, async route => {
    record(route, 'draft');
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        sliceId: stubSliceId,
        assets: [{ assetId: stubAssetId, kind: 'screenshot' }],
      }),
    });
  });

  await context.route(assetPattern, async route => {
    record(route, 'asset');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, assetId: stubAssetId }),
    });
  });

  await context.route(refreshPattern, async route => {
    record(route, 'auth-refresh');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'pw-fake-access-token-refreshed',
        refreshToken: 'pw-fake-refresh-token-refreshed',
      }),
    });
  });

  return {
    requests: () => recorded.slice(),
    assetUploads: () => recorded.filter(r => r.matchedRoute === 'asset'),
    waitForAssetUpload: async (timeoutMs = 15_000) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const hit = recorded.find(r => r.matchedRoute === 'asset');
        if (hit) return hit;
        await new Promise(r => setTimeout(r, 100));
      }
      throw new Error(
        `Timed out after ${timeoutMs}ms waiting for an asset upload. Recorded calls: ` +
          JSON.stringify(
            recorded.map(r => `${r.method} ${r.url}`),
            null,
            2,
          ),
      );
    },
  };
};

export { installMockApi };
export type { MockApi };
