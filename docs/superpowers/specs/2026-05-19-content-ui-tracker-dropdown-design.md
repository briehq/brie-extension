# Content-UI Tracker Dropdown — Design Spec

**Date:** 2026-05-19
**Status:** Draft — awaiting user approval
**Repo:** `brie-extension`

## Goal

Let users create a Brie slice **and** send it to a connected tracker (Linear, Jira, GitHub) in a single click from the in-page modal. Today the create-dropdown's tracker rows are commented out and a `disabled` gate forces the `link` path. The slice already lives in content-ui; only the tracker send is missing.

## Non-Goals

- Backend changes (the `POST /slices/external` and `POST /integrations/:workspaceId/github/issues` endpoints already exist).
- Retry UI on tracker failure (backend dedupe is not implemented; v1 falls back to the Brie slice page and toasts the failure).
- Persisting the user's last tracker choice across sessions.
- Per-tracker configuration (project/team picker, repo picker, etc.) — v1 uses workspace defaults silently.
- Showing the dropdown when no trackers are connected (existing `moreIntegrationSoon` footer covers that case).

## Decisions Locked

| ID | Decision | Source |
|----|----------|--------|
| Q1 | Filter visible providers — only show a tracker row if the workspace has an *active* integration for it | User |
| Q2 | GitHub uses the workspace's first linked repository silently (no picker) | User |
| Q3 | On tracker-send failure: open the Brie slice page (mirror link path) and toast the error. No inline error, no retry button. | User |
| Q4 | Default selected action stays `link` | User (accepted recommendation) |
| Q5 | On tracker-send success: redirect to the *tracker's* issue URL (Jira/Linear/GitHub), not the Brie slice URL | User |
| Q6 | If the integrations query fails: silent fallback — show only `link`, console-error the cause | User (accepted recommendation) |

## Architecture

Three layers change:

1. **`packages/store/lib/store/integrations/`** — new RTK Query slice exposing the three calls the extension needs: list workspace integrations, list linked GitHub repos, create a Linear/Jira external issue, create a GitHub issue. Wired into the root reducer + middleware in `packages/store/lib/store/index.ts` next to the existing APIs.
2. **`pages/content-ui/src/components/dialog-view/create-dropdown.ui.tsx`** — accepts an `actions` prop instead of hard-coding the list. The disabled gate and `moreIntegrationSoon` footer disappear when at least one tracker action is present (the footer is kept as the empty-state).
3. **`pages/content-ui/src/content.tsx`** — fetches active integrations + linked GitHub repos on modal open, builds the `actions` list, drops the `createType !== 'link'` short-circuit, and calls the right mutation per action type after `runSliceCreationFlow()` resolves.

## File Structure

### New files

```
packages/store/lib/store/integrations/
├── integrations.api.ts          # RTK Query slice (createApi)
├── integrations.types.ts        # IIntegrationConnection, ILinkedRepository, CreateAction, payload + response types
└── index.ts                     # Re-exports hooks + types (use the existing `index.js` extension convention)

packages/ui/lib/components/icons/
├── linear.tsx                   # LinearIcon SVG component
└── jira.tsx                     # JiraIcon SVG component

pages/content-ui/src/components/dialog-view/
└── create-dropdown.util.ts      # Pure buildCreateActions + LINK_ACTION + PROVIDER_LABEL
```

### Modified files

```
packages/store/lib/store/index.ts                                    # Wire integrationsAPI into rootReducer + middleware
packages/ui/lib/components/ui/icon.tsx                               # Register LinearIcon + JiraIcon in customIcons map
pages/content-ui/src/components/dialog-view/create-dropdown.ui.tsx   # Accept controlled actions + activeAction props; remove disabled gate; conditional footer
pages/content-ui/src/content.tsx                                     # createType → activeAction state; effectiveWorkspaceId; integration queries; tracker dispatch in handleOnCreate
packages/i18n/locales/<lang>/messages.json                           # 5 new keys per locale (English filled; others mirror English)
```

## Components & Interfaces

### `integrations.types.ts`

```ts
export type IntegrationProvider = 'LINEAR' | 'JIRA' | 'GITHUB';

export interface IIntegrationConnection {
  id: string;
  provider: IntegrationProvider;
  name: string | null;
  defaultTeamId?: string | null;
  defaultProjectId?: string | null;
  settings?: Record<string, unknown> | null;
  createdAt: string;
}

export interface ILinkedRepository {
  id: string;
  workspaceId: string;
  provider: 'GITHUB';
  owner: string;
  name: string;
  integrationId: string;
}

// Generic external-issue payload (Linear/Jira)
export interface CreateExternalIssuePayload {
  sliceId: string;
  title: string;
  description?: string;
  brieFields?: Record<string, unknown>;
  workspaceId: string;
}

export interface ExternalIssueResponse {
  id: string;
  provider: IntegrationProvider | string;
  externalId: string;
  key: string;
  url: string;
  status: string | null;
  title: string | null;
  createdAt: string;
}

export interface GithubIssueResponse {
  id: string;
  key: string;
  url: string;
  title: string;
  status: string;
}

// Discriminated union driving the dropdown rows.
// Note: `name` is the localized label; the dropdown resolves it via t() at render time,
// so the builder util stays pure and locale-agnostic. See "Components & Interfaces" → buildCreateActions.
export type CreateAction =
  | { key: 'link'; nameKey: 'createLink'; icon: 'LinkIcon' }
  | { key: 'linear'; nameKey: 'createLinear'; icon: 'LinearIcon'; integrationId: string; workspaceId: string }
  | { key: 'jira'; nameKey: 'createJira'; icon: 'JiraIcon'; integrationId: string; workspaceId: string }
  | { key: 'github'; nameKey: 'createGithub'; icon: 'GithubIcon'; repositoryId: string; workspaceId: string };
```

### `integrations.api.ts`

```ts
export const integrationsAPI = createApi({
  reducerPath: 'integrations',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['WORKSPACE_INTEGRATIONS', 'LINKED_REPOS'],
  endpoints: (build) => ({
    getIntegrationsByWorkspaceId: build.query<IIntegrationConnection[], { workspaceId: string }>({
      providesTags: ['WORKSPACE_INTEGRATIONS'],
      query: ({ workspaceId }) => ({ url: `/workspaces/${workspaceId}/integrations` }),
    }),

    getLinkedGithubRepos: build.query<ILinkedRepository[], { workspaceId: string }>({
      providesTags: ['LINKED_REPOS'],
      query: ({ workspaceId }) => ({
        url: `/integrations/${workspaceId}/github/repositories/linked`,
      }),
    }),

    createExternalIssue: build.mutation<
      ExternalIssueResponse,
      { integrationId: string; body: CreateExternalIssuePayload }
    >({
      query: ({ integrationId, body }) => ({
        url: '/slices/external',
        method: 'POST',
        body: { ...body, integrationId },
      }),
    }),

    createGithubIssue: build.mutation<
      GithubIssueResponse,
      { workspaceId: string; sliceId: string; repositoryId: string }
    >({
      query: ({ workspaceId, sliceId, repositoryId }) => ({
        url: `/integrations/${workspaceId}/github/issues`,
        method: 'POST',
        body: { sliceId, repositoryId },
      }),
    }),
  }),
});
```

The extension's RTK Query cache is isolated per context (per the existing comment in `slices-private.api.ts:32`). Content-UI is injected per page, and `packages/store/lib/store/index.ts` exports a singleton `store` at module load — so the cache is fresh on every page injection. This means each modal open triggers one network fetch for integrations (and one for linked repos). Acceptable for v1; users open the modal a few times per session at most. No pre-warming from the popup is viable due to the cross-context isolation.

### `create-dropdown.ui.tsx`

**New prop shape:**

```ts
type Props = {
  isLoading: boolean;
  actions: CreateAction[];                 // ordered list; 'link' is always [0]
  activeAction: CreateAction;              // fully controlled by parent (no internal default)
  onChange: (action: CreateAction) => void; // called with the full action object
};
```

The component is now fully controlled — parent owns `activeAction` and `actions`. The dropdown itself holds no selection state and no derived defaults. This removes the prior contradiction between "parent owns the key" and "parent owns the full action".

**Behavior changes:**

- `createActions` array is removed; the component renders whatever `actions` it receives.
- `disabled={action.key !== 'link'}` removed; tracker rows are enabled.
- `moreIntegrationSoon` footer renders only when `actions.length === 1` (i.e. only `link` is available).
- The active action's name (resolved via `t(activeAction.nameKey)`) is shown on the main button.
- Selecting a row updates the parent via `onChange(action)`; the main button click dispatches with the *currently selected* action.

**Icons (decision locked):** add `LinearIcon` and `JiraIcon` to `@extension/ui`'s `customIcons` map in `packages/ui/lib/components/ui/icon.tsx`. GitHub uses Lucide's existing `GithubIcon` — no registry change needed. Brand SVGs land in `packages/ui/lib/components/icons/` next to the existing `BlurIcon`. Falling back to a generic `BlocksIcon` for all three was rejected because it defeats the dropdown's discoverability (users need to recognize "this is Jira"). The icon-registry change is one file (`icon.tsx`) plus two SVG components — small and isolated.

### `content.tsx` changes

**State:**
- Replace `useState('')` for `createType` (content.tsx:82) with `useState<CreateAction>(LINK_ACTION)` where `LINK_ACTION` is the canonical `link` action const exported from `create-dropdown.util.ts`. Parent owns the full action.
- **`workspaceId` source** (correcting a prior assumption): it is local state at content.tsx:80, set by the workspace dropdown in the header. The memoized `workspace` at content.tsx:104-107 (`user?.organization?.workspaces?.find(w => w.isDefault && !w.deletedAt)`) is the canonical default. Use `const effectiveWorkspaceId = workspaceId || workspace?.id || ''` for the integration queries.

**Guest mode (explicit short-circuit):**
- `isGuest` is computed at content.tsx:109. When `isGuest === true`, force `actions = [LINK_ACTION]` and skip both integration queries. Guests have no organization/workspaces.

**Integrations fetch + actions build:**
- Add hooks in the parent:
  - `useGetIntegrationsByWorkspaceIdQuery({ workspaceId: effectiveWorkspaceId }, { skip: isGuest || !effectiveWorkspaceId })`
  - `useGetLinkedGithubReposQuery({ workspaceId: effectiveWorkspaceId }, { skip: isGuest || !effectiveWorkspaceId })`
- Build `actions` via the pure `buildCreateActions({ integrations, linkedRepos, isGuest })` util (colocated as `create-dropdown.util.ts`). Memoize on `[integrations, linkedRepos, isGuest]`. The util returns `[LINK_ACTION]` whenever data is missing or in guest mode — the modal stays usable through any load/error state. While the queries are pending, the dropdown renders only `link` and silently expands once data resolves.
- If `activeAction` is no longer in `actions` (e.g., workspace switch removed the selected tracker), reset to `LINK_ACTION` via a `useEffect` watching `actions`.

**`buildCreateActions` (pure util in `create-dropdown.util.ts`):**

```ts
export const LINK_ACTION: CreateAction = { key: 'link', nameKey: 'createLink', icon: 'LinkIcon' };

export const buildCreateActions = ({
  integrations,
  linkedRepos,
  isGuest,
}: {
  integrations?: IIntegrationConnection[];
  linkedRepos?: ILinkedRepository[];
  isGuest: boolean;
}): CreateAction[] => {
  if (isGuest) return [LINK_ACTION];

  const actions: CreateAction[] = [LINK_ACTION];
  // Earliest connection wins per provider (tiebreaker for the multi-connection edge case)
  const sorted = [...(integrations ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const seen = new Set<string>();
  for (const c of sorted) {
    if (seen.has(c.provider)) continue;
    if (c.provider === 'LINEAR') {
      actions.push({ key: 'linear', nameKey: 'createLinear', icon: 'LinearIcon', integrationId: c.id, workspaceId: (c as any).workspaceId ?? '' });
      seen.add(c.provider);
    } else if (c.provider === 'JIRA') {
      actions.push({ key: 'jira', nameKey: 'createJira', icon: 'JiraIcon', integrationId: c.id, workspaceId: (c as any).workspaceId ?? '' });
      seen.add(c.provider);
    }
  }
  const githubConnected = sorted.some(c => c.provider === 'GITHUB');
  const firstRepo = linkedRepos?.[0];
  if (githubConnected && firstRepo) {
    actions.push({ key: 'github', nameKey: 'createGithub', icon: 'GithubIcon', repositoryId: firstRepo.id, workspaceId: firstRepo.workspaceId });
  }
  return actions;
};
```

Note: `IIntegrationConnection` as returned by `GET /workspaces/:workspaceId/integrations` does not include `workspaceId` in the dashboard's existing type definition. The plan will verify the actual response shape and either (a) augment the type or (b) thread `effectiveWorkspaceId` through `buildCreateActions` so each tracker action carries it. Option (b) is preferred — see the plan.

**`handleOnCreate` — payload comes from local state, not the returned draft.**

Critical correction from the prior draft: `InitSliceResponse` returns only `{ id, externalId, status, assets }` (verified at `packages/shared/lib/interfaces/slice.interface.ts:85`). None of `summary`/`description`/`priority`/`reporter`/`workspaceId` are on the returned draft. The tracker payload must be built from the **same local state already used to construct `InitSliceRequest`** at content.tsx:222-235: `title`, `description`, `priority`, `effectiveWorkspaceId`, plus `user.email` and `user.organization.id` from the existing `@extension/store` selector.

```ts
handleOnCreate({ labels, priority, attachments, description, spaceId }):
  if (isCreateLoading) return                       // removed createType !== 'link' guard
  setIsCreateLoading(true)
  try {
    [...existing file prep + InitSliceRequest payload build unchanged...]
    const { draft: slice, uploaded } = await runSliceCreationFlow({...})

    if (slice?.id || slice?.externalId) {
      if (activeAction.key === 'link') {
        toast(t('openReport'))
        const path = isGuest ? `s/${slice.externalId}` : `slices/${slice.id}`
        safeOpenNewTab(`${APP_BASE_URL}/${path}`)
        await finalizeCreation(slice.id, uploaded)
        return
      }

      // Tracker path — build payload from local state + user, not from `slice`
      try {
        let trackerUrl: string
        if (activeAction.key === 'github') {
          const result = await createGithubIssue({
            workspaceId: activeAction.workspaceId,
            sliceId: slice.id,
            repositoryId: activeAction.repositoryId,
          }).unwrap()
          trackerUrl = result.url
        } else {
          const body: CreateExternalIssuePayload = {
            sliceId: slice.id,
            title: title || `Bug from Brie – ${slice.externalId || slice.id}`,
            description: description ?? '',
            brieFields: {
              sliceExternalId: slice.externalId,
              organizationId: user?.organization?.id,
              reportedBy: user?.email,
              priority,
            },
            workspaceId: activeAction.workspaceId,
          }
          const result = await createExternalIssue({
            integrationId: activeAction.integrationId,
            body,
          }).unwrap()
          trackerUrl = result.url
        }
        toast.success(t('createdInTracker', PROVIDER_LABEL[activeAction.key]))
        safeOpenNewTab(trackerUrl)
        await finalizeCreation(slice.id, uploaded)
      } catch (trackerErr) {
        console.error('[OnCreate Tracker Error]', trackerErr)
        toast.error(t('trackerSendFailedFallback', PROVIDER_LABEL[activeAction.key]))
        // Fall back to Brie slice page so the user lands somewhere actionable
        const path = isGuest ? `s/${slice.externalId}` : `slices/${slice.id}`
        safeOpenNewTab(`${APP_BASE_URL}/${path}`)
        await finalizeCreation(slice.id, uploaded)
      }
      return
    }

    // [existing draft-with-error-code branch unchanged]
  } catch (error) { /* existing unexpectedError toast */ }
  finally { setIsCreateLoading(false) }
```

`PROVIDER_LABEL = { linear: 'Linear', jira: 'Jira', github: 'GitHub' }` — kept out of i18n so brand names render identically across locales. The `t()` call uses Chrome-i18n positional `$1` substitution (see "i18n Keys to Add" below).

The outer catch (for `runSliceCreationFlow` failures) is unchanged — if slice creation itself fails, the existing `unexpectedError` toast handles it.

## Data Flow

```
modal opens
  │
  ├─ useGetIntegrationsByWorkspaceIdQuery({ workspaceId })
  ├─ useGetLinkedGithubReposQuery({ workspaceId })
  │
  ▼
parent builds actions = [link, ...trackers]   (memoized)
  │
  ▼
<CreateDropdown actions activeKey onChange />
  │
  user clicks main button
  ▼
handleOnCreate(formData, activeAction)
  │
  ├─ runSliceCreationFlow()  →  { slice, uploaded }
  │
  ▼ activeAction.key === ?
  ├─ link    → safeOpenNewTab(brieUrl) → finalizeCreation → done
  ├─ linear  ─┐
  ├─ jira    ─┤
  │           ├─ try: createExternalIssue({ integrationId, body })
  │           │       toast 'created…'; safeOpenNewTab(result.url); finalize
  │           └─ catch: toast 'fallback…'; safeOpenNewTab(brieUrl); finalize
  │
  └─ github  ─┐
              ├─ try: createGithubIssue({ workspaceId, sliceId, repositoryId })
              │       toast 'created…'; safeOpenNewTab(result.url); finalize
              └─ catch: toast 'fallback…'; safeOpenNewTab(brieUrl); finalize
```

## Error Handling

| Failure | Behavior |
|---------|----------|
| `getIntegrationsByWorkspaceId` errors / empty | `actions = [link]`; `moreIntegrationSoon` footer renders; `console.error` for diagnostics |
| `getLinkedGithubRepos` errors / empty | GitHub action omitted from `actions`; Linear/Jira unaffected |
| `runSliceCreationFlow` throws | Existing behavior — `unexpectedError` toast; modal stays open |
| Tracker mutation throws or returns no `url` | Toast `trackerSendFailedFallback`; redirect to Brie slice URL; `finalizeCreation` runs |
| Tracker mutation succeeds | Toast `createdInTracker`; redirect to `result.url`; `finalizeCreation` runs |

## Testing

This codebase ships without unit tests for content-ui (verified — no `*.spec.ts` files alongside `content.tsx` or the dropdown). The plan will rely on manual verification, matching the existing pattern. Manual test matrix:

1. **Guest user** → dropdown shows only `link` + footer; no integration network calls fire (verify in DevTools).
2. **Authenticated, workspace with no integrations** → dropdown shows only `link` + footer. Existing behavior unchanged.
3. **Workspace with Linear connected** → `Create Linear` row appears, enabled. Selecting it + submit creates a Brie slice + Linear issue, redirects to Linear URL.
4. **Workspace with Jira connected** → same as (3) for Jira.
5. **Workspace with GitHub connected, no linked repos** → GitHub row hidden.
6. **Workspace with GitHub connected, at least one linked repo** → `Create GitHub` row appears. Submit creates issue against the first linked repo, redirects to GitHub URL.
7. **Workspace with all three connected** → all three rows present, `link` default-selected.
8. **Tracker mutation fails** (force a 500 via DevTools throttling or auth issue) → toast shows the fallback message; user lands on the Brie slice page; the slice is still in Brie.
9. **Switch workspaces while modal open** → action list updates; `activeAction` resets to `LINK_ACTION` if the previously selected key is no longer present.
10. **`workspaceId` empty** (user hasn't selected a workspace and no default exists — edge case) → integration queries skip; only `link` shown.

The action-builder is the natural future unit-test seam: `buildCreateActions({ integrations, linkedRepos, isGuest })` is pure and easy to cover with table-driven cases when the team adds Vitest to content-ui. No tests are added in v1 (matches the existing content-ui pattern), but the seam is intentional.

## i18n Keys to Add

The `@extension/i18n` package uses Chrome-i18n style **positional** substitutions (`$1`, `$2`, …) — verified at `packages/i18n/lib/i18n.ts:26`. Call shape: `t('createdInTracker', 'Jira')` → `"Created in Jira"`.

In each locale file under `packages/i18n/locales/<lang>/messages.json`:

| Key | English copy | Call shape |
|-----|--------------|-----------|
| `createLinear` | "Create Linear" | `t('createLinear')` |
| `createJira` | "Create Jira" | `t('createJira')` |
| `createGithub` | "Create GitHub" | `t('createGithub')` |
| `createdInTracker` | "Created in $1" | `t('createdInTracker', 'Jira')` |
| `trackerSendFailedFallback` | "Slice saved. Couldn't send to $1 — opening Brie." | `t('trackerSendFailedFallback', 'Jira')` |

English values are filled. Other locales mirror the English entry until translated — matches the existing pattern in `packages/i18n/locales/` for new keys.

## Open Risks

1. **Duplicate tracker issues on user retry** — v1 has no retry button, but the user could close + re-open + resubmit. Backend dedupe is out of scope; slice creation is idempotent via `Idempotency-Key`, but the tracker send is not. Tracked in `brie-api-service/docs/TECH_DEBT.md` as ARCH-M5 (alongside the endpoint-shape inconsistency). Accepted v1 limitation.
2. **`workspaceId` on `IIntegrationConnection` response** — the dashboard's type doesn't include `workspaceId`. The plan must verify the actual response shape; if absent, thread `effectiveWorkspaceId` through `buildCreateActions` instead of reading from each connection (already noted in the builder section).
3. **`finalizeCreation` semantics** — verified safe: it only patches the slice state and deletes records (content.tsx:148-168). It does not assume the user landed on the Brie slice page, so the tracker-redirect path is fine.
