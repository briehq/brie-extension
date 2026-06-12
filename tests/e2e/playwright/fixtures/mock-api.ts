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
 *  - POST /slices/draft        — returns InitSliceResponse with asset
 *    placeholders for every kind the dialog might upload (screenshot,
 *    video, records, events, annotations). RTK Query then walks those IDs.
 *  - POST /slices/{id}/assets/{aid} — accepts FormData, returns 200.
 *  - POST /auth/refresh        — in case the seeded fake tokens hit the
 *    pre-emptive refresh path.
 *
 * Routes are installed at context-level so both the popup page and any host
 * page (where content-ui's fetches originate) inherit them. RTK Query fires
 * from the page realm in both cases, which is what page.route can see.
 *
 * We DON'T route everything — only the patterns above — so any other request
 * fails loudly if the flow ever depends on a new endpoint.
 *
 * Shape note: the draft response mirrors `InitSliceResponse` from
 * packages/shared/lib/interfaces/slice.interface.ts. The video happy-path
 * needs `assets.video` + `assets.records` populated; the screenshot path
 * uses `assets.screenshots` + `assets.records`. Returning all of them every
 * time keeps the fixture reusable across specs and Phase 3 (if/when we add
 * a real-backend soak run, we can swap this route to passthrough).
 */
const installMockApi = async (context: BrowserContext): Promise<MockApi> => {
  const recorded: RecordedRequest[] = [];

  const stubSliceId = 'pw-stub-slice-id';
  const assetIds = {
    screenshot: 'pw-stub-asset-screenshot',
    video: 'pw-stub-asset-video',
    records: 'pw-stub-asset-records',
    events: 'pw-stub-asset-events',
    annotations: 'pw-stub-asset-annotations',
  };

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
        id: stubSliceId,
        externalId: `EXT-${stubSliceId}`,
        status: 'draft',
        assets: {
          screenshots: [{ id: assetIds.screenshot, uploaded: false }],
          records: { id: assetIds.records, uploaded: false },
          video: { id: assetIds.video, uploaded: false },
          events: { id: assetIds.events, uploaded: false },
          annotations: { id: assetIds.annotations, uploaded: false },
        },
      }),
    });
  });

  await context.route(assetPattern, async route => {
    record(route, 'asset');
    const url = route.request().url();
    const match = url.match(/\/assets\/([^/?]+)/);
    const assetId = match?.[1] ?? assetIds.screenshot;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: assetId, uploaded: true }),
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
