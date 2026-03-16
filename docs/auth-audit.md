# Auth Flow Audit — End-to-End

**Date:** 2026-02-18
**Branch:** `feature/capture-session`
**Scope:** All auth entry points, all methods, security, state consistency, cross-context messaging

---

## Auth State Machine

```
┌─────────────────┐
│ CHECKING_HEALTH  │───── health fails ──────►┌──────────────────┐
│  (mount)         │                          │  API_UNAVAILABLE  │◄─┐
└────────┬────────┘                          └────────┬─────────┘  │
         │ health OK                                  │ retry()    │
         ▼                                            └────────────┘
   ┌─────────────┐
   │ has tokens?  │
   └──┬───────┬──┘
      │ no    │ yes
      ▼       ▼
 UNAUTH   ┌──────────────┐
           │ CHECKING_AUTH │──── 401 ─────────► UNAUTHENTICATED
           │  (GET /me)    │──── non-401 err ──► ERROR ◄──┐
           └──────┬───────┘                       │ retry  │
                  │ user OK                       └────────┘
                  ▼
          ┌────────────────┐
          │  user.id &&    │── no ──► UNAUTHENTICATED
          │  !GUEST?       │
          └───────┬────────┘
                  │ yes
                  ▼
            AUTHENTICATED
```

**Lives in:** `pages/popup/src/hooks/use-auth-state.hook.ts` → wrapped by `AuthStateProvider` → consumed by `AuthGuard`

**Token watch:** `useStorage(authTokensStorage)` reactively detects token changes (including background-initiated clears), triggering phase re-derivation without polling.

---

## PASS/FAIL Checklist Per Auth Method

### Email (via `identity.launchWebAuthFlow`)

| # | Check | Result | File:Line |
|---|-------|--------|-----------|
| 1 | Popup sends `AUTH.START` to background | PASS | `use-auth-identity-provider.hook.ts:34` → `message.service.ts:50-51` |
| 2 | Background opens browser window to web app `/auth` | PASS | `auth.service.ts:12-17` |
| 3 | Tokens extracted from URL fragment on redirect | PASS | `persist-tokens.util.ts:13-17` (chrome-extension copy) |
| 4 | Tokens persisted to `chrome.storage.local` | PASS | `persist-tokens.util.ts:23` |
| 5 | `AUTH.STATUS` broadcast to content script | PASS | `auth.service.ts:22` → `runtime.event-listeners.ts:28-30` |
| 6 | Content-UI shows toast on auth result | PASS | `App.tsx:58-60` |
| 7 | Popup closes on success | PASS | `use-auth-identity-provider.hook.ts:39` |
| 8 | Error propagation on failure | PASS | `auth.service.ts:25-32` → `use-auth-identity-provider.hook.ts:42-44` |
| 9 | User cancel detected cleanly | PASS | `auth.service.ts:27` regex matches Chrome cancel error |
| 10 | Flow mutex (only one at a time) | PASS | `use-auth-identity-provider.hook.ts:28` checks `authFlow?.active` |

### Phone

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | `AuthMethod.PHONE` in enum | PASS | `auth-method.enum.ts:3` |
| 2 | Extension-side phone auth flow | N/A | No phone-specific flow in extension. The web app at `APP_BASE_URL/auth` handles phone. The extension only opens the browser window and receives tokens back. Phone auth works through the same `identity.launchWebAuthFlow` path as email. |

### Google OAuth

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | `AuthMethod.GOOGLE` in enum | PASS | `auth-method.enum.ts:4` |
| 2 | Extension-side Google flow | N/A | Same as email — delegated to web app via `identity.launchWebAuthFlow`. No Google-specific client ID or OAuth config in extension code. |
| 3 | PKCE / state parameter | **FAIL** | See Bug #1 below |

### Twitter OAuth

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | `AuthMethod.TWITTER` in enum | **FAIL** | Does not exist. Enum has: EMAIL, PHONE, GOOGLE, APPLE, GUEST. No TWITTER. See Bug #2 below. |
| 2 | Extension-side Twitter flow | N/A | If the web app supports Twitter, it would work through the same `identity.launchWebAuthFlow` path — but the extension cannot identify or distinguish Twitter-authenticated users. |

### Apple

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | `AuthMethod.APPLE` in enum | PASS | `auth-method.enum.ts:5` |
| 2 | Extension-side Apple flow | N/A | Same delegation pattern as Google/Phone. |

### Guest (disabled)

| # | Check | Result | Notes |
|---|-------|--------|-------|
| 1 | `AuthMethod.GUEST` in enum | PASS | `auth-method.enum.ts:6` |
| 2 | Login endpoint wired | PASS | `auth-public.api.ts:10-15` → `POST /auth/login/guest` |
| 3 | Button rendered | **DISABLED** | `auth.ui.tsx:47-56` — commented out "for security reasons" |
| 4 | Guest users treated as unauthenticated | PASS (intentional) | `use-auth-state.hook.ts:102` |

---

## State Handling Consistency

| # | Check | Result | File:Line |
|---|-------|--------|-----------|
| 1 | Single source of truth for tokens | PASS | `authTokensStorage` (`chrome.storage.local`, key: `auth-tokens-storage-key`) — all reads and writes go through this one storage instance |
| 2 | Reactive token propagation | PASS | `liveUpdate: true` in `tokens.storage.ts:8` — all contexts get notified via `chrome.storage.onChanged` |
| 3 | State machine uses `isLoading` not `isFetching` | PASS | `use-auth-state.hook.ts:85` — background refetches no longer flash skeleton |
| 4 | Token refresh uses mutex | PASS | `api.service.ts:40-66` — `async-mutex` prevents refresh stampede |
| 5 | Token refresh failure clears tokens | PASS | `api.service.ts:52` — immediate clear, no more `setTimeout` |
| 6 | Auth reducer syncs on guest login | PASS | `auth.reducer.ts:22-29` — writes tokens to storage |
| 7 | No explicit logout message | **FAIL** | See Bug #3 — no `AUTH.LOGOUT` message, no Redux cache reset on token clear |
| 8 | `authIdentityProviderStorage` cleared on completion | PASS | `use-auth-identity-provider.hook.ts:45` — `finally` block clears |
| 9 | Unconditional clear on mount removed | PASS | Previous `useEffect(() => setAuthFlow(null))` was removed |

---

## Security Audit

| # | Check | Result | Details |
|---|-------|--------|---------|
| 1 | PKCE for OAuth | **FAIL** | No `code_challenge`/`code_verifier` in extension. See Bug #1. |
| 2 | `state` parameter for CSRF protection | **FAIL** | No `state` param in auth URL construction (`auth.service.ts:12`). See Bug #1. |
| 3 | Tokens in URL fragment (not query params) | PASS | `persist-tokens.util.ts:13` parses `hash` not `search` — fragments are not sent to server in HTTP requests |
| 4 | No tokens in `console.log` | **FAIL** | `pages/popup/src/utils/auth/persist-tokens.util.ts:22` has `console.log('tokens', tokens)`. See Bug #4. |
| 5 | No tokens in `postMessage` | PASS | Grep confirmed zero matches for `postMessage.*token` |
| 6 | No tokens in `chrome.runtime.sendMessage` | PASS | Only `AUTH.START` (no payload) and `AUTH.STATUS` (`{ ok, error }`) are sent — no token values |
| 7 | Redirect allow-list | **WARN** | `identity.getRedirectURL()` returns Chrome's built-in `https://<hash>.chromiumapp.org/` which is intrinsically safe (Chrome controls it). No custom allow-list needed for Chrome. Firefox fallback uses `runtime.getURL('auth-identity.html')` which is also extension-internal. However, the web app at `APP_BASE_URL/auth` should validate `redirect_uri` server-side. |
| 8 | Token storage in `chrome.storage.local` | PASS | Acceptable for extensions — `chrome.storage.local` is isolated per-extension, not accessible from web pages |
| 9 | Sensitive data redaction in recordings | PASS | `redact-sensitive-info.util.ts` + `denylist.constant.ts` blocks recording on auth pages (Google, Apple, Okta, Auth0, etc.) and redacts `oauth_token`, `password`, `secret` etc. |
| 10 | `identity` permission declared | PASS | `manifest.ts:36` |

---

## Cross-Context Messaging

| # | Check | Flow | Result | Details |
|---|-------|------|--------|---------|
| 1 | Popup → Background | `AUTH.START` | PASS | `runtime.sendMessage({type: AUTH.START})` → `handleOnMessage` switch → `handleOnAuthStart()` → returns `BgResponse` |
| 2 | Background → Content Script | `AUTH.STATUS` | PASS | `sendMessageToActiveTab(AUTH.STATUS, payload)` → `tabs.sendMessage` → `runtime.onMessage.addListener` in content script |
| 3 | Content Script → Content UI | `AUTH.STATUS` | PASS | `window.dispatchEvent(new CustomEvent(AUTH.STATUS, { detail }))` → `window.addEventListener(AUTH.STATUS)` in App.tsx |
| 4 | Error propagation: auth failure | | PASS | Background catches, returns `{ ok: false, error }` to popup AND sends to content script |
| 5 | Error propagation: `sendMessageToActiveTab` failure | | PASS | Wrapped in try/catch in `tabs.service.ts:18-24`, logged but doesn't break auth flow |
| 6 | No active tab (extension opened without tab) | | PASS | `sendMessageToActiveTab` returns silently if no active tab (`tabs.service.ts:31`) |

---

## Magic Strings Audit

| # | Check | Result | Details |
|---|-------|--------|---------|
| 1 | Auth message types | PASS | `AUTH.START`, `AUTH.STATUS` in `auth.message.ts` as `as const` |
| 2 | Auth method enum | PASS | `AuthMethod` enum in `auth-method.enum.ts` |
| 3 | Error sentinel strings | **WARN** | `'EMPTY_URL'`, `'USER_CANCELLED'`, `'Auth flow failed'` are raw strings in `auth.service.ts` and `use-auth-identity-provider.hook.ts` — not centralized but only used locally |
| 4 | API endpoints | **WARN** | `/auth/refresh`, `/auth/login/guest`, `/users/me`, `/health` are inline strings in their respective RTK Query/service files — not centralized but each used in exactly one place |
| 5 | Storage keys | **WARN** | `'auth-tokens-storage-key'`, `'auth-flow-storage-key'` are raw strings in storage files — not centralized but each defined once |
| 6 | Toast in api.service.ts | **FAIL** | `toast.error('Your login session has expired...')` is a raw English string, not using `t()`. See Bug #5. |

---

## Bugs Found

### Bug #1 (Security): No PKCE or `state` param for OAuth — DEFERRED

**Severity:** Medium (mitigated by `identity.launchWebAuthFlow` + fragment tokens)
**File:** `chrome-extension/src/services/auth.service.ts:12`

The URL sent to `identity.launchWebAuthFlow` is:
```
{APP_BASE_URL}/auth?redirect_uri={encodedRedirectUri}
```

No `state` parameter (CSRF protection) or `code_challenge` (PKCE) is included.

**Mitigation already in place:**
- `identity.launchWebAuthFlow` is a Chrome-managed API that handles the browser window internally
- The redirect URL is `*.chromiumapp.org` which Chrome exclusively controls
- Tokens arrive in the URL fragment (not query params) so they're not leaked to intermediary servers

**Recommendation:** This should be handled server-side. The web app at `APP_BASE_URL/auth` should:
1. Generate and validate a `state` parameter
2. Use PKCE (`code_challenge` / `code_verifier`) if doing authorization code flow
3. Validate `redirect_uri` against an allow-list

**No extension-side patch needed** — this is a server-side concern. The extension's `identity.launchWebAuthFlow` model (implicit flow with fragment tokens) inherently doesn't use PKCE. If moving to authorization code flow, PKCE should be added to both client and server.

### Bug #2: Missing `TWITTER` in `AuthMethod` enum

**Severity:** Low (functional — the web app may return `TWITTER` as `authMethod` but the extension won't recognize it)
**File:** `packages/shared/lib/constants/enums/auth-method.enum.ts`

The enum has `EMAIL`, `PHONE`, `GOOGLE`, `APPLE`, `GUEST` but no `TWITTER`. If the API returns a user with `authMethod: 'TWITTER'`, the auth state machine will still authenticate them (it only rejects `GUEST` and missing `id`), but any future Twitter-specific UI logic would have no constant to match against.

**Fix:** Add `TWITTER = 'TWITTER'` to the enum.

### Bug #3: No logout flow / no Redux cache reset

**Severity:** Medium (stale data after re-login)
**Files:** No `AUTH.LOGOUT` message exists. `api.service.ts:52` clears tokens but doesn't reset RTK Query caches.

When tokens are cleared (refresh failure), the RTK Query cache still holds the old user data. If a different user logs in, stale data from the previous session could briefly appear.

**Fix:** After clearing tokens, dispatch `api.util.resetApiState()` for all RTK Query APIs.

### Bug #4 (Security): Token leak in `console.log`

**Severity:** High
**File:** `pages/popup/src/utils/auth/persist-tokens.util.ts:22`

```typescript
console.log('tokens', tokens);  // ← leaks accessToken + refreshToken to DevTools console
```

This file is a duplicate of `chrome-extension/src/utils/persist-tokens.util.ts` (which does NOT have the console.log). The popup copy is currently dead code (not imported anywhere in the active flow) but remains dangerous if ever imported.

**Fix:** Remove the `console.log` line. Ideally, delete the duplicate file entirely.

### Bug #5: Un-internationalized toast message

**Severity:** Low (cosmetic, non-localized)
**File:** `packages/store/lib/services/api.service.ts:51`

```typescript
toast.error('Your login session has expired. Please sign in again.');
```

Every other user-facing auth string uses `t()` from `@extension/i18n`. This one is a raw English string.

**Fix:** Replace with `t('sessionExpired')` and add the key to all locale files.

### Bug #6: Dead code — duplicate `persistTokens` and unused auth utils

**Severity:** Low (maintenance debt)
**Files:**
- `pages/popup/src/utils/auth/persist-tokens.util.ts` — duplicate of `chrome-extension/src/utils/persist-tokens.util.ts`
- `pages/popup/src/utils/auth/redirect-url.util.ts` — unused, not imported anywhere
- `pages/popup/src/utils/auth/wait-final-uri.util.ts` — unused, not imported anywhere

These are remnants of a previous auth implementation approach (noted by the `@todo` in `use-auth-identity-provider.hook.ts:52-55`).

**Fix:** Delete all three files and their barrel exports.

### Bug #7: `VIDEO.CAPTURED` listener not cleaned up

**Severity:** Low (memory leak)
**File:** `pages/content-ui/src/App.tsx:41,49`

```typescript
window.addEventListener(VIDEO.CAPTURED, handleOnVideoCaptured);  // line 41 — added
// ...
// line 49 — NOT removed in cleanup return
```

The `VIDEO.CAPTURED` event listener is added but never removed in the cleanup function. This is in the content-UI auth-adjacent code.

### Bug #8 (Security): XHR interceptor does not redact Authorization headers

**Severity:** Medium
**File:** `pages/content/src/interceptors/network/xhr.interceptor.ts`

The fetch interceptor at `pages/content/src/interceptors/network/fetch.interceptor.ts:7-8` redacts sensitive headers:
```typescript
const REDACT_HEADER_KEYS = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
const REDACT_BODY_KEYS = ['password', 'pass', 'token', 'secret', 'authorization', 'auth'];
```

But the XHR interceptor has **no equivalent redaction**. It captures all response headers raw (line 52-56) and posts them via `safePostMessage(RECORD.ADD, ...)`. Any XHR request carrying an `Authorization: Bearer <token>` header would have that token captured unredacted in network records.

**Fix:** Add the same `REDACT_HEADER_KEYS` redaction to the XHR interceptor's response header processing.

---

## Files Reference

| File | Role |
|------|------|
| `pages/popup/src/hooks/use-auth-state.hook.ts` | Auth state machine (health → token → user) |
| `pages/popup/src/providers/auth-state.provider.tsx` | Context wrapper for auth state |
| `pages/popup/src/guards/auth.guard.tsx` | Phase-based view switching |
| `pages/popup/src/components/ui/auth.ui.tsx` | Login screen |
| `pages/popup/src/hooks/use-auth-identity-provider.hook.ts` | OAuth flow trigger (sends `AUTH.START`) |
| `chrome-extension/src/services/auth.service.ts` | Background: `identity.launchWebAuthFlow` + token persistence |
| `chrome-extension/src/services/message.service.ts` | Background: message router |
| `chrome-extension/src/utils/persist-tokens.util.ts` | Parse tokens from URL fragment |
| `packages/storage/lib/impl/auth/tokens.storage.ts` | `chrome.storage.local` for tokens |
| `packages/storage/lib/impl/auth/identity-provider.storage.ts` | Auth flow active flag |
| `packages/store/lib/services/api.service.ts` | Mutex-protected token refresh |
| `packages/store/lib/store/auth/auth-public.api.ts` | Guest login endpoint |
| `packages/store/lib/store/auth/auth.reducer.ts` | Redux auth slice |
| `packages/store/lib/store/user/user.api.ts` | `GET /users/me` |
| `packages/shared/lib/constants/messages/auth.message.ts` | `AUTH.START` / `AUTH.STATUS` |
| `packages/shared/lib/constants/enums/auth-method.enum.ts` | `AuthMethod` enum |
| `pages/content/src/event-listeners/runtime.event-listeners.ts` | Content script: bridges `AUTH.STATUS` to window |
| `pages/content-ui/src/App.tsx` | Content UI: auth toast |
