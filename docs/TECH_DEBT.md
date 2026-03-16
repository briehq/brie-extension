# Tech Debt

## Proxy content-ui API calls through the background service worker

**Status:** Planned
**Priority:** Medium
**Area:** Content UI, Background, Store

### Problem

The content-ui (annotation modal, rrweb player, etc.) runs as a content script injected into host pages. When RTK Query makes API requests from this context, the browser sends the host page's origin in CORS preflights (e.g., `https://example.com`), not the extension's origin.

Currently, the API allows all `chrome-extension://` origins via a dynamic CORS check. This works but is less secure than the alternative approach below.

### Proposed solution

Route all content-ui API requests through the background service worker, which is not subject to CORS restrictions.

**Why this is better:**
- The background service worker runs in an extension context with full `host_permissions` — no CORS preflight is needed
- The API can keep a strict, static CORS allowlist (only `APP_URL` and `API_BASE_URL`)
- Aligns with the existing message-passing architecture (`chrome.runtime.sendMessage`)

**Implementation outline:**

1. Create a message handler in the background service worker that proxies API requests:
   ```ts
   // chrome-extension/src/background/api-proxy.service.ts
   chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
     if (message.type !== 'API_PROXY') return false;

     const { url, method, headers, body } = message.payload;

     fetch(url, { method, headers, body })
       .then(res => res.json().then(data => ({ status: res.status, data })))
       .then(sendResponse)
       .catch(err => sendResponse({ error: err.message }));

     return true; // keep the message channel open for async response
   });
   ```

2. Create a custom RTK Query `baseQuery` for content-ui that sends requests via message passing instead of `fetch`:
   ```ts
   const contentUiBaseQuery: BaseQueryFn = async (args, api, extraOptions) => {
     const tokens = await authTokensStorage.getTokens();
     const response = await chrome.runtime.sendMessage({
       type: 'API_PROXY',
       payload: {
         url: `${API_BASE_URL}${args.url || args}`,
         method: args.method || 'GET',
         headers: { Authorization: `Bearer ${tokens.accessToken}`, ...args.headers },
         body: args.body ? JSON.stringify(args.body) : undefined,
       },
     });

     if (response.error) return { error: response.error };
     return { data: response.data };
   };
   ```

3. Use the proxy base query in content-ui's store configuration, or conditionally select the base query based on execution context.

**Considerations:**
- `chrome.runtime.sendMessage` has a ~64 MB message size limit — large uploads (video, screenshots) may need chunking or a different approach
- File/FormData uploads (e.g., `uploadAssetBySliceId`) cannot be serialized over message passing — these would need to stay as direct requests or use a blob URL workaround
- Token refresh logic (`baseQueryWithReauth`) would move to the background, simplifying content-ui auth handling

---

## Auto error detection toast (bug detected notification)

**Status:** Disabled (listener removed in content-ui `App.tsx`)
**Priority:** Medium
**Area:** Content UI, Content, Settings

### Context

The extension intercepts console errors and network failures via `pages/content/src/interceptors/` and dispatches `ERROR.DETECTED` events. The content-ui previously listened for these and showed a toast with a "Rewind" action to replay the session.

This was disabled because it needs refinement before shipping:

### What needs to be done

1. **Per-domain user setting** — Add a toggle in the popup settings that lets users enable/disable auto error detection per domain (e.g., enable for `app.example.com`, disable for `google.com`). Store in Chrome Storage as a domain allowlist/blocklist.

2. **Deduplication** — Show each unique error only once per page session. Fingerprint errors using the error message + parsed stack trace. The removed implementation used a `Set<string>` with `useRef` — this approach was correct.

3. **Cooldown refinement** — The content script already has a 60s cooldown (`ERROR_NOTIFICATION_COOLDOWN_MS` in `window.event-listeners.ts`). Decide whether dedup replaces the cooldown or both should coexist.

4. **Noise filtering** — Consider filtering out common non-actionable errors (e.g., CORS errors from third-party scripts, ad network failures, browser extension conflicts).

### Files involved

- `pages/content-ui/src/App.tsx` — re-add `ERROR.DETECTED` listener with dedup + settings check
- `pages/content/src/event-listeners/window.event-listeners.ts` — error dispatch logic
- `pages/content/src/interceptors/console/console.interceptor.ts` — console error capture
- `pages/content/src/interceptors/network/fetch.interceptor.ts` — network error capture
- `packages/storage/` — new storage for error detection settings (domain allowlist)
- `pages/popup/` — settings UI for enabling/disabling per domain
