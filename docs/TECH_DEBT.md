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

---

## Deferred dependency upgrades (post refactor/performance)

**Status:** Deferred
**Priority:** Low
**Area:** Build / runtime

Three Dependabot PRs against `develop` are intentionally held until after the `refactor/performance` branch is merged. Each is a major version bump that warrants its own focused validation pass, and merging them now would just be more conflict surface for the perf branch to resolve.

### PRs to revisit

| # | Bump | Why deferred |
|---|---|---|
| #297 | `@hookform/resolvers` 4.1.3 → 5.4.0 | Major. v5 changes peer-dep expectations around `react-hook-form` and the validation libs (zod/yup/etc.). Need to confirm our `react-hook-form` + `zod` versions still satisfy the new peer ranges before merging. |
| #300 | `rrweb-player` 1.0.0-alpha.4 → 2.0.0 | Alpha → stable major. We use this in `pages/content-ui/src/components/recording-view/views/rewind-player.view.tsx`. Need to compare the v2 API surface against our current props/event handlers. |
| #301 | `globals` 15.15.0 → 17.6.0 | Major dev dep. Used by the ESLint flat config (`eslint.config.ts`). v16 changed how Node 18 / browser globals are bundled — flat config may need adjustments. |

### When to pick this up

After `refactor/performance` → `develop` is merged. At that point:
1. Trigger `@dependabot rebase` on each so they pick up the new lockfile.
2. Validate each one independently — type-check, build, and the Playwright `test:site` non-interference suite.
3. For `rrweb-player`, also smoke-test a recording in the dialog editor (play, pause, scrub, trim).

---

## refactor/performance audit — WARNING-tier follow-ups

**Status:** Open
**Priority:** Low–Medium
**Area:** Various

The paranoid-review pass against `refactor/performance` flagged 11 WARNING-tier items (non-blocking, but real). Five were classed as worth landing on develop after the perf merge. Each is a small, isolated fix.

### Items

| # | File | Issue | Fix sketch |
|---|---|---|---|
| W-1 | `packages/i18n/locales/{es,fil,hi,it,ro,ru,uk}/messages.json` | Missing 4 keys: `noCaptureData`, `emptyResultFallback`, `noStepsFound`, `outputTruncated`. Firefox doesn't fall back to `en` for missing keys — non-EN Firefox users see blank strings. | Copy the EN values into each non-EN locale, or add a runtime `t(key) || t('fallback')` helper. |
| W-2 | `pages/content-ui/src/index.tsx` | `themeStorage.listenToSystemThemeChanges()` is called at module load with no teardown. Content-ui is the long-lived shadow-DOM app — every re-injection adds another `matchMedia` listener on the same MediaQueryList object. | Capture the returned unsubscribe and call it from a `pagehide` listener (or move into a `useEffect` inside the `<App />` root). |
| W-3 | `pages/mic-permission/src/mic-permission.tsx` | If the component unmounts during the `getUserMedia` promise, the continuation re-arms the auto-close `setTimeout` and calls `setState('granted')` on an unmounted component. Harmless in practice but unsound. | Add an `isMountedRef = useRef(true)`, set false in the cleanup, gate both `setState` calls and `setTimeout` scheduling behind it. |
| W-4 | `pages/content/src/capture/screenshot.capture.ts` | `cleanup()` only removes the `updateSelectionBox` listener from `mousemove`/`touchmove`. The `onMouseMove` / `onTouchMove` attached by `showInstructions()` are never removed — they leak on `document` for the page lifetime after ESC/completion. | Add `document.removeEventListener('mousemove', onMouseMove)` and the `touchmove` equivalent inside `cleanup()`. |
| W-5 | `pages/content-ui/src/utils/annotation/canvas.util.ts` | `renderCanvas` is exported but no call site exercises it. The Phase 6 batched-enliven rewrite was correct but landed in dead code; the stated goal was never realised. | Either wire it into `restoreObjects` / `getSavedAnnotations` (the previous calling pattern), or delete it from the barrel export. |

### When to pick this up

After `refactor/performance` → `develop` merge. None block the merge.

Suggested grouping for follow-up PRs:
1. W-1 alone — touches 6 locale files, easy review.
2. W-2 + W-3 — both are "useEffect teardown" patterns.
3. W-4 — single-file fix.
4. W-5 — investigation pass to decide wire-in vs delete.
