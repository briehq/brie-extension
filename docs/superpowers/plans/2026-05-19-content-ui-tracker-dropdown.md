# Content-UI Tracker Dropdown — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users create a Brie slice and send it to a connected tracker (Linear / Jira / GitHub) in one click from the in-page modal, redirecting to the tracker's issue URL on success.

**Architecture:** New RTK Query slice in `@extension/store` exposes `getIntegrationsByWorkspaceId`, `getLinkedGithubRepos`, `createExternalIssue`, `createGithubIssue`. The create-dropdown becomes fully controlled (`actions` + `activeAction` props). `content.tsx` builds the action list via a pure `buildCreateActions` util, dispatches the right mutation after slice creation, and redirects to the tracker URL on success or to the Brie slice URL on tracker-send failure.

**Tech Stack:** React 19, TypeScript 5.8, RTK Query (`@reduxjs/toolkit`), Tailwind, `@extension/ui` (Radix + Lucide), `@extension/i18n` (Chrome-i18n `$1`-style positional placeholders).

**Spec:** `brie-extension/docs/superpowers/specs/2026-05-19-content-ui-tracker-dropdown-design.md`

**Backend endpoints used (already shipped, do not modify):**
- `GET /workspaces/:workspaceId/integrations` → `IntegrationConnection[]`
- `GET /integrations/:workspaceId/github/repositories/linked` → `LinkedRepository[]`
- `POST /slices/external` (Linear, Jira) — body: `{ integrationId, sliceId, title, description, brieFields, workspaceId }`
- `POST /integrations/:workspaceId/github/issues` — body: `{ sliceId, repositoryId }`

**Verification approach:** content-ui has no unit-test infrastructure (verified — no `*.spec.ts` files in `pages/content-ui/`). The plan uses `pnpm type-check` + `pnpm lint` as the gate after each task, with manual browser verification at the end. Do NOT add test infrastructure as part of this work.

**Branch:** `feature/content-ui-tracker-dropdown`

---

## Decisions Locked (from spec)

1. **Q1 — Filter, don't disable**: only show provider rows for workspaces with active integrations.
2. **Q2 — GitHub silent first-repo**: use the workspace's first linked repo with no picker.
3. **Q3 — Failure fallback**: on tracker-send failure, mirror the link path (redirect to Brie slice page + toast). No inline error, no retry button.
4. **Q4 — Default selection**: stays `link`.
5. **Q5 — Success redirect**: open the tracker's issue URL, not the Brie slice URL.
6. **Q6 — Integrations query fails**: silent fallback to `link`-only; `console.error` for diagnostics.

---

## File Structure

### New files

```
packages/store/lib/store/integrations/
├── integrations.types.ts                                          # IntegrationConnection, LinkedRepository, CreateExternalIssuePayload, ExternalIssueResponse, GithubIssueResponse, CreateAction discriminated union
├── integrations.api.ts                                            # createApi with the 4 endpoints
└── index.ts                                                       # Re-exports hooks + types (matches existing .js extension convention)

packages/ui/lib/components/icons/
├── linear.ui.tsx                                                  # LinearIcon (matches BlurIcon forwardRef pattern)
└── jira.ui.tsx                                                    # JiraIcon (matches BlurIcon forwardRef pattern)

pages/content-ui/src/components/dialog-view/
└── create-dropdown.util.ts                                        # LINK_ACTION, PROVIDER_LABEL, buildCreateActions pure function
```

### Modified files

```
packages/store/lib/constants/tag-type.const.ts                     # Add WORKSPACE_INTEGRATIONS, LINKED_REPOS
packages/store/lib/store/index.ts                                  # Wire integrationsAPI into rootReducer + middleware
packages/ui/lib/components/icons/index.ts                          # Re-export LinearIcon, JiraIcon
packages/ui/lib/components/ui/icon.tsx                             # Register LinearIcon + JiraIcon in customIcons map
packages/i18n/locales/<8 locales>/messages.json                    # Add createGithub, createdInTracker, trackerSendFailedFallback (createLinear, createJira already exist)
pages/content-ui/src/components/dialog-view/create-dropdown.ui.tsx # Accept controlled actions + activeAction props; remove disabled gate; conditional footer
pages/content-ui/src/components/annotation-view/ui/header.ui.tsx   # Thread actions + activeAction + onChange through
pages/content-ui/src/content.tsx                                   # createType → activeAction; effectiveWorkspaceId; integration queries; tracker dispatch in handleOnCreate
```

---

## Task 1: Integrations store slice (types + tag types)

**Files:**
- Create: `packages/store/lib/store/integrations/integrations.types.ts`
- Modify: `packages/store/lib/constants/tag-type.const.ts`

- [ ] **Step 1.1: Add new tag types**

Modify `packages/store/lib/constants/tag-type.const.ts` to add two new entries:

```ts
export const TAG_TYPE = {
  ME: 'ME',
  ORGANIZATION: 'ORGANIZATION',
  SLICE: 'SLICE',
  SLICES: 'SLICES',
  SPACES: 'SPACES',
  WORKSPACES: 'WORKSPACES',
  WORKSPACE: 'WORKSPACE',
  WORKSPACE_INTEGRATIONS: 'WORKSPACE_INTEGRATIONS',
  LINKED_REPOS: 'LINKED_REPOS',
  SUBSCRIPTIONS: 'SUBSCRIPTIONS',
  AI_GENERATE: 'AI_GENERATE',
  AI_TRANSCRIPTION: 'AI_TRANSCRIPTION',
} as const;

export type TagType = (typeof TAG_TYPE)[keyof typeof TAG_TYPE];
```

- [ ] **Step 1.2: Create integrations.types.ts**

Create `packages/store/lib/store/integrations/integrations.types.ts`:

```ts
export type IntegrationProvider = 'LINEAR' | 'JIRA' | 'GITHUB' | 'AZURE_DEVOPS';

export interface IntegrationConnection {
  id: string;
  provider: IntegrationProvider;
  name: string | null;
  defaultTeamId?: string | null;
  defaultProjectId?: string | null;
  settings?: Record<string, unknown> | null;
  createdAt: string;
}

export interface LinkedRepository {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  workspaceId: string;
  provider: IntegrationProvider;
  externalRepositoryId: string;
  owner: string;
  name: string;
  defaultBranch: string | null;
  isActive: boolean;
  integrationId: string;
}

export interface CreateExternalIssuePayload {
  sliceId: string;
  title: string;
  description?: string;
  brieFields?: Record<string, unknown>;
  projectId?: string;
  issueTypeId?: string;
  workspaceId: string;
}

export interface ExternalIssueResponse {
  id: string;
  provider: IntegrationProvider;
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

export type CreateActionKey = 'link' | 'linear' | 'jira' | 'github';

export type CreateAction =
  | { key: 'link'; nameKey: 'createLink'; icon: 'LinkIcon' }
  | { key: 'linear'; nameKey: 'createLinear'; icon: 'LinearIcon'; integrationId: string; workspaceId: string }
  | { key: 'jira'; nameKey: 'createJira'; icon: 'JiraIcon'; integrationId: string; workspaceId: string }
  | { key: 'github'; nameKey: 'createGithub'; icon: 'GithubIcon'; repositoryId: string; workspaceId: string };
```

- [ ] **Step 1.3: Type-check**

Run from `brie-extension/`: `pnpm type-check`
Expected: PASS — no new errors. (The new file is unused yet; it should still parse cleanly.)

- [ ] **Step 1.4: Commit**

```bash
git add packages/store/lib/constants/tag-type.const.ts packages/store/lib/store/integrations/integrations.types.ts
git commit -m "feat(store): add integrations types + tag types for tracker dropdown"
```

---

## Task 2: Integrations RTK Query slice

**Files:**
- Create: `packages/store/lib/store/integrations/integrations.api.ts`
- Create: `packages/store/lib/store/integrations/index.ts`
- Modify: `packages/store/lib/store/index.ts:3-15` (imports), `:18-44` (rootReducer), `:48-60` (middleware) — exact lines may shift; locate by symbol

- [ ] **Step 2.1: Create integrations.api.ts**

Create `packages/store/lib/store/integrations/integrations.api.ts`:

```ts
import { createApi } from '@reduxjs/toolkit/query/react';

import { TAG_TYPE } from '../../constants/tag-type.const.js';
import { baseQueryWithReauth } from '../../services/index.js';
import type {
  CreateExternalIssuePayload,
  ExternalIssueResponse,
  GithubIssueResponse,
  IntegrationConnection,
  LinkedRepository,
} from './integrations.types.js';

export const integrationsAPI = createApi({
  reducerPath: 'integrations',
  baseQuery: baseQueryWithReauth,
  tagTypes: [TAG_TYPE.WORKSPACE_INTEGRATIONS, TAG_TYPE.LINKED_REPOS],
  endpoints: build => ({
    getIntegrationsByWorkspaceId: build.query<IntegrationConnection[], { workspaceId: string }>({
      providesTags: [TAG_TYPE.WORKSPACE_INTEGRATIONS],
      query: ({ workspaceId }) => ({ url: `/workspaces/${workspaceId}/integrations` }),
    }),

    getLinkedGithubRepos: build.query<LinkedRepository[], { workspaceId: string }>({
      providesTags: [TAG_TYPE.LINKED_REPOS],
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

export const {
  useGetIntegrationsByWorkspaceIdQuery,
  useGetLinkedGithubReposQuery,
  useCreateExternalIssueMutation,
  useCreateGithubIssueMutation,
} = integrationsAPI;
```

- [ ] **Step 2.2: Create integrations/index.ts**

Create `packages/store/lib/store/integrations/index.ts`:

```ts
export { integrationsAPI } from './integrations.api.js';
export {
  useGetIntegrationsByWorkspaceIdQuery,
  useGetLinkedGithubReposQuery,
  useCreateExternalIssueMutation,
  useCreateGithubIssueMutation,
} from './integrations.api.js';
export type {
  CreateAction,
  CreateActionKey,
  CreateExternalIssuePayload,
  ExternalIssueResponse,
  GithubIssueResponse,
  IntegrationConnection,
  LinkedRepository,
  IntegrationProvider,
} from './integrations.types.js';
```

- [ ] **Step 2.3: Wire integrationsAPI into the root store**

Modify `packages/store/lib/store/index.ts`:

Add to the imports section (alphabetical, near the other `*.api` imports):

```ts
import { integrationsAPI } from './integrations/index.js';
```

Add to `rootReducer` (place near the other `*.api` reducers, e.g. just before `screenshotAPI`):

```ts
  [integrationsAPI.reducerPath]: integrationsAPI.reducer,
```

Add to the `middleware` chain (place next to the other `.concat(...)` calls):

```ts
        .concat(integrationsAPI.middleware)
```

- [ ] **Step 2.4: Re-export hooks + types from the public store package surface**

The package entry is `packages/store/index.mts`, which re-exports from `./lib/store/index.js`. Hooks are exposed via **named re-exports** in `packages/store/lib/store/index.ts` (look for the existing block near lines 71-90 that re-exports `useGetUserDetailsQuery`, `useUpdateSliceStateMutation`, etc. — do NOT use `export *`, follow the existing named-export style).

Add a new named-export block in `packages/store/lib/store/index.ts` next to the existing ones:

```ts
export {
  useGetIntegrationsByWorkspaceIdQuery,
  useGetLinkedGithubReposQuery,
  useCreateExternalIssueMutation,
  useCreateGithubIssueMutation,
} from './integrations/index.js';

export type {
  CreateAction,
  CreateActionKey,
  CreateExternalIssuePayload,
  ExternalIssueResponse,
  GithubIssueResponse,
  IntegrationConnection,
  LinkedRepository,
  IntegrationProvider,
} from './integrations/index.js';
```

This ensures `import { useGetIntegrationsByWorkspaceIdQuery } from '@extension/store'` resolves in `pages/content-ui/` via the existing `index.mts` → `lib/store/index.js` re-export chain.

- [ ] **Step 2.5: Type-check and lint**

```bash
pnpm type-check
pnpm lint
```

Expected: PASS — no new errors. If the lint reports import-order issues, fix them by following the existing alphabetical ordering in `store/index.ts`.

- [ ] **Step 2.6: Commit**

```bash
git add packages/store/lib/store/integrations/ packages/store/lib/store/index.ts
git commit -m "feat(store): add integrationsAPI with 4 endpoints (list + linked-repos + external + github issue)"
```

---

## Task 3: Brand icons (Linear + Jira) registered in `@extension/ui`

**Files:**
- Create: `packages/ui/lib/components/icons/linear.ui.tsx`
- Create: `packages/ui/lib/components/icons/jira.ui.tsx`
- Modify: `packages/ui/lib/components/icons/index.ts`
- Modify: `packages/ui/lib/components/ui/icon.tsx`

- [ ] **Step 3.1: Create LinearIcon**

Create `packages/ui/lib/components/icons/linear.ui.tsx` — adapt from `brie-app/src/components/icons/integrations/linear.tsx` to match the `BlurIcon` `forwardRef` pattern used in the extension's UI package:

```tsx
import * as React from 'react';

type LinearIconProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
};

export const LinearIcon = React.forwardRef<SVGSVGElement, LinearIconProps>(
  ({ size = 24, className, ...rest }, ref) => (
    <svg
      {...rest}
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none">
      <path
        d="M1.04279 13.1844C1.30291 15.6872 2.41795 18.0237 4.19993 19.8002C5.97609 21.5819 8.31213 22.6969 10.8144 22.9573L1.04279 13.1844Z"
        fill="#5E6AD2"
      />
      <path
        d="M1 11.4161L12.5839 23C13.5721 22.9447 14.5482 22.7562 15.486 22.4399L1.56138 8.51279C1.24447 9.45089 1.05564 10.4275 1 11.4161Z"
        fill="#5E6AD2"
      />
      <path
        d="M2.05807 7.28627L16.7137 21.9419C17.4862 21.5715 18.2125 21.1115 18.8775 20.5714L3.42857 5.12131C2.88838 5.78669 2.42839 6.51335 2.05807 7.28627Z"
        fill="#5E6AD2"
      />
      <path
        d="M4.24988 4.21701C6.30969 2.15719 9.10341 1 12.0164 1C14.9294 1 17.7232 2.15719 19.783 4.21701C21.8428 6.27683 23 9.07054 23 11.9836C23 14.8966 21.8428 17.6903 19.783 19.7501L4.24988 4.21701Z"
        fill="#5E6AD2"
      />
    </svg>
  ),
);
LinearIcon.displayName = 'LinearIcon';
```

- [ ] **Step 3.2: Create JiraIcon**

Create `packages/ui/lib/components/icons/jira.ui.tsx`. The dashboard's `jira.tsx` uses a base64-encoded PNG, which is heavy for an extension bundle. Use a clean vector instead — the Atlassian Jira blue-stack mark:

```tsx
import * as React from 'react';

type JiraIconProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
};

export const JiraIcon = React.forwardRef<SVGSVGElement, JiraIconProps>(
  ({ size = 24, className, ...rest }, ref) => (
    <svg
      {...rest}
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="none">
      <path
        d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.762a1.005 1.005 0 0 0-1.001-1.005zM23.013 0H11.456a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z"
        fill="#2684FF"
      />
    </svg>
  ),
);
JiraIcon.displayName = 'JiraIcon';
```

- [ ] **Step 3.3: Re-export from icons/index.ts**

Modify `packages/ui/lib/components/icons/index.ts`:

```ts
export { BlurIcon } from './blur.ui';
export { LinearIcon } from './linear.ui';
export { JiraIcon } from './jira.ui';
```

- [ ] **Step 3.4: Register in customIcons**

Modify `packages/ui/lib/components/ui/icon.tsx`:

```tsx
import * as radix from '@radix-ui/react-icons';
import * as lucide from 'lucide-react';
import type { ComponentType, FC, SVGProps } from 'react';

import { BlurIcon, JiraIcon, LinearIcon } from '../icons';

const customIcons = {
  BlurIcon,
  LinearIcon,
  JiraIcon,
} satisfies Record<string, ComponentType<SVGProps<SVGSVGElement>>>;

type LucideName = keyof typeof lucide;
type RadixName = keyof typeof radix;
type CustomName = keyof typeof customIcons;

export type IconName = LucideName | RadixName | CustomName;
export type IconProps = {
  name: IconName;
} & lucide.LucideProps;

export const Icon: FC<IconProps> = ({ name, ...rest }) => {
  const Component = (lucide as any)[name] ?? (radix as any)[name] ?? (customIcons as any)[name];

  if (!Component) {
    console.error(`Icon "${name}" does not exist.`);

    return null;
  }

  return <Component {...rest} />;
};
```

- [ ] **Step 3.5: Verify `GithubIcon` is exported by Lucide**

Run: `node -e "console.log(Object.keys(require('lucide-react')).filter(n => /github/i.test(n)))"` from `brie-extension/`.
Expected: output contains `'Github'` and likely `'GithubIcon'`. If only `Github` is present (older Lucide), use `'Github'` everywhere in this plan instead of `'GithubIcon'`. Update `CreateAction`'s GitHub variant in `integrations.types.ts` accordingly.

- [ ] **Step 3.6: Type-check and lint**

```bash
pnpm type-check
pnpm lint
```

Expected: PASS.

- [ ] **Step 3.7: Commit**

```bash
git add packages/ui/lib/components/icons/ packages/ui/lib/components/ui/icon.tsx
git commit -m "feat(ui): register LinearIcon + JiraIcon in @extension/ui customIcons"
```

---

## Task 4: i18n keys

**Files:**
- Modify: `packages/i18n/locales/en/messages.json`
- Modify: `packages/i18n/locales/es/messages.json`
- Modify: `packages/i18n/locales/fil/messages.json`
- Modify: `packages/i18n/locales/hi/messages.json`
- Modify: `packages/i18n/locales/it/messages.json`
- Modify: `packages/i18n/locales/ro/messages.json`
- Modify: `packages/i18n/locales/ru/messages.json`
- Modify: `packages/i18n/locales/uk/messages.json`

**Note:** `createLinear` ("Create in Linear") and `createJira` ("Create in Jira") already exist. Do not touch them. Add only `createGithub`, `createdInTracker`, and `trackerSendFailedFallback`.

- [ ] **Step 4.1: Add keys to English locale**

Modify `packages/i18n/locales/en/messages.json` — add three entries near the existing `createLinear` / `createJira` / `createAzure` block. Use Chrome-i18n positional placeholder syntax (`$1`):

```json
  "createGithub": {
    "message": "Create in GitHub"
  },
  "createdInTracker": {
    "message": "Created in $1"
  },
  "trackerSendFailedFallback": {
    "message": "Slice saved. Couldn't send to $1 — opening Brie."
  },
```

- [ ] **Step 4.2: Mirror the English entries into the other 7 locales**

For each of `es`, `fil`, `hi`, `it`, `ro`, `ru`, `uk`, add the same three keys with the English copy (matches the existing pattern for un-translated new keys — verify by checking how `createLinear` is rendered across locales: `grep "createLinear" packages/i18n/locales/*/messages.json`).

- [ ] **Step 4.3: Validate JSON syntax across all 8 locales**

Run:

```bash
for f in packages/i18n/locales/*/messages.json; do
  node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" && echo "OK: $f" || echo "FAIL: $f"
done
```

Expected: 8 lines, all `OK:`.

- [ ] **Step 4.3b: Validate all 3 new keys exist in all 8 locales**

Missing-locale at runtime is a hard `TypeError` in `@extension/i18n` (verified — `i18n.ts:5` reads `localeJSON[key].message` with no fallback). Confirm parity:

```bash
for key in createGithub createdInTracker trackerSendFailedFallback; do
  for f in packages/i18n/locales/*/messages.json; do
    grep -q "\"$key\"" "$f" || echo "MISSING $key in $f"
  done
done
```

Expected: zero output. Any `MISSING` line is a bug — add the key to that locale before proceeding.

- [ ] **Step 4.4: Type-check**

```bash
pnpm type-check
```

Expected: PASS. (`@extension/i18n` generates type definitions from messages.json — if a key is referenced before it's added, type-check fails. None are referenced yet, so this should pass.)

- [ ] **Step 4.5: Commit**

```bash
git add packages/i18n/locales/
git commit -m "feat(i18n): add createGithub, createdInTracker, trackerSendFailedFallback keys"
```

---

## Task 5: `create-dropdown.util.ts` — pure action builder

**Files:**
- Create: `pages/content-ui/src/components/dialog-view/create-dropdown.util.ts`

- [ ] **Step 5.1: Create the util**

Create `pages/content-ui/src/components/dialog-view/create-dropdown.util.ts`:

```ts
import type { CreateAction, IntegrationConnection, LinkedRepository } from '@extension/store';

export const LINK_ACTION: CreateAction = {
  key: 'link',
  nameKey: 'createLink',
  icon: 'LinkIcon',
};

export const PROVIDER_LABEL: Record<Exclude<CreateAction['key'], 'link'>, string> = {
  linear: 'Linear',
  jira: 'Jira',
  github: 'GitHub',
};

export const buildCreateActions = ({
  integrations,
  linkedRepos,
  isGuest,
  workspaceId,
}: {
  integrations?: IntegrationConnection[];
  linkedRepos?: LinkedRepository[];
  isGuest: boolean;
  workspaceId: string;
}): CreateAction[] => {
  if (isGuest || !workspaceId) return [LINK_ACTION];

  const actions: CreateAction[] = [LINK_ACTION];

  const sorted = [...(integrations ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const seen = new Set<string>();
  for (const conn of sorted) {
    if (seen.has(conn.provider)) continue;

    if (conn.provider === 'LINEAR') {
      actions.push({
        key: 'linear',
        nameKey: 'createLinear',
        icon: 'LinearIcon',
        integrationId: conn.id,
        workspaceId,
      });
      seen.add(conn.provider);
    } else if (conn.provider === 'JIRA') {
      actions.push({
        key: 'jira',
        nameKey: 'createJira',
        icon: 'JiraIcon',
        integrationId: conn.id,
        workspaceId,
      });
      seen.add(conn.provider);
    }
  }

  const githubConnected = sorted.some(conn => conn.provider === 'GITHUB');
  const firstRepo = linkedRepos?.[0];
  if (githubConnected && firstRepo) {
    actions.push({
      key: 'github',
      nameKey: 'createGithub',
      icon: 'GithubIcon',
      repositoryId: firstRepo.id,
      workspaceId: firstRepo.workspaceId || workspaceId,
    });
  }

  return actions;
};
```

- [ ] **Step 5.2: Type-check and lint**

```bash
pnpm type-check
pnpm lint
```

Expected: PASS.

- [ ] **Step 5.3: Commit**

```bash
git add pages/content-ui/src/components/dialog-view/create-dropdown.util.ts
git commit -m "feat(content-ui): add pure buildCreateActions util + LINK_ACTION/PROVIDER_LABEL consts"
```

---

## Task 6: Refactor `create-dropdown.ui.tsx` to controlled props

**Prerequisite:** Task 4 (i18n keys) MUST be completed first. The new dropdown references `t('createGithub')` via the discriminated union's `nameKey`, and `@extension/i18n` derives the `t()` argument type from `en/messages.json` at compile time. If Task 6 runs before Task 4, type-check fails on `'createGithub'`.

**Combined-commit note:** Tasks 6, 7, and 8 each touch consumers of each other. The intermediate type-check states between them are broken. To keep `git bisect` clean, **defer the commits in Tasks 6 and 7 until Task 8 is complete and type-check passes** — see Step 8.11 for the consolidated commit. The pre-commit hook only runs lint-staged (Prettier + ESLint), not type-check, so intermediate commits would technically pass — but a clean history matters more.

**Files:**
- Modify: `pages/content-ui/src/components/dialog-view/create-dropdown.ui.tsx`

- [ ] **Step 6.1: Replace the component body**

Replace the entire contents of `pages/content-ui/src/components/dialog-view/create-dropdown.ui.tsx` with:

```tsx
import { t } from '@extension/i18n';
import type { CreateAction } from '@extension/store';
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
} from '@extension/ui';

type CreateDropdownProps = {
  isLoading: boolean;
  actions: CreateAction[];
  activeAction: CreateAction;
  onChange: (action: CreateAction) => void;
};

export const CreateDropdown = ({ isLoading, actions, activeAction, onChange }: CreateDropdownProps) => {
  const handleValueChange = (key: string) => {
    const next = actions.find(action => action.key === key);
    if (next) onChange(next);
  };

  const showFooter = actions.length === 1;

  return (
    <DropdownMenu>
      <Button
        form="details-form"
        disabled={isLoading}
        onClick={() => onChange(activeAction)}
        className="bg-gradient-overlay dark:bg-primary flex h-[35px] min-w-[160px] justify-between gap-x-2 p-0">
        <div className="py-2 pl-[10px]">
          <span>{t(activeAction.nameKey)} </span>
        </div>

        <DropdownMenuTrigger asChild>
          <div
            className="px-[10px] py-2"
            style={{
              borderLeft: '1px solid rgba(250, 249, 247, 0.20)',
            }}>
            <Icon name="ChevronDownIcon" size={16} />
          </div>
        </DropdownMenuTrigger>
      </Button>

      <DropdownMenuContent align="end" sideOffset={8} className="w-[200px]">
        <DropdownMenuRadioGroup value={activeAction.key} onValueChange={handleValueChange}>
          {actions.map(action => (
            <DropdownMenuRadioItem
              key={action.key}
              value={action.key}
              className={cn({ 'text-muted-foreground': action.key !== activeAction.key })}>
              <div className="flex h-8 w-8 items-center justify-center">
                <Icon name={action.icon} className="h-3.5 w-3.5" />
              </div>

              <span>{t(action.nameKey)}</span>
            </DropdownMenuRadioItem>
          ))}

          {showFooter && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-muted-foreground text-center text-[10px] font-normal">
                {t('moreIntegrationSoon')}
              </DropdownMenuLabel>
            </>
          )}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

- [ ] **Step 6.2: Type-check (informational; expected to fail)**

```bash
pnpm type-check
```

Expected: type-check FAILS on `header.ui.tsx:192` and `content.tsx` because they still pass the old props (`onChange: (key: string) => void`). Tasks 7 and 8 fix those. **Any other failure outside `header.ui.tsx` and `content.tsx` must be resolved before continuing.** Do NOT commit yet — see the combined-commit note above.

---

## Task 7: Thread new props through `Header`

**Files:**
- Modify: `pages/content-ui/src/components/annotation-view/ui/header.ui.tsx`

The Header is the intermediary between `content.tsx` and `CreateDropdown`. Its props need to forward the new dropdown contract.

- [ ] **Step 7.1: Update `EditorHeaderProps`**

In `pages/content-ui/src/components/annotation-view/ui/header.ui.tsx`, locate the `interface EditorHeaderProps` block (around line 9). Replace the existing `onCreate: (key: string) => void;` line with:

```ts
  createActions: CreateAction[];
  activeCreateAction: CreateAction;
  onCreate: (action: CreateAction) => void;
```

Add the import at the top of the file:

```ts
import type { CreateAction } from '@extension/store';
```

- [ ] **Step 7.2: Update the Header component signature**

In the same file, update the destructured props in the component signature (around lines 40-63) to include the two new props:

```ts
export const Header: React.FC<EditorHeaderProps> = ({
  // ... existing destructured props ...
  createActions,
  activeCreateAction,
  onCreate,
  // ... rest ...
}) => {
```

- [ ] **Step 7.3: Update the `<CreateDropdown>` call site**

Around line 192, replace:

```tsx
<CreateDropdown isLoading={isCreateLoading} onChange={onCreate} />
```

with:

```tsx
<CreateDropdown
  isLoading={isCreateLoading}
  actions={createActions}
  activeAction={activeCreateAction}
  onChange={onCreate}
/>
```

- [ ] **Step 7.4: Type-check (informational; expected to fail only on content.tsx)**

```bash
pnpm type-check
```

Expected: type-check FAILS only on `content.tsx` now that Header's props demand `createActions` + `activeCreateAction` + the new `onCreate` shape. Task 8 fixes that. Do NOT commit yet — the consolidated commit happens in Step 8.11.

---

## Task 8: `content.tsx` — state, queries, and tracker dispatch

**Files:**
- Modify: `pages/content-ui/src/content.tsx`

This is the largest change. Make all sub-changes in one task (single file), then run type-check / lint once at the end.

- [ ] **Step 8.1: Add new imports**

At the top of `pages/content-ui/src/content.tsx`, add:

```ts
import type { CreateAction, CreateExternalIssuePayload } from '@extension/store';
import {
  useCreateExternalIssueMutation,
  useCreateGithubIssueMutation,
  useGetIntegrationsByWorkspaceIdQuery,
  useGetLinkedGithubReposQuery,
} from '@extension/store';
```

These go in the existing `@extension/store` import block (line 10-15). Merge into a single import statement to keep import-order lint happy.

Also import the util at the same level as the other `./components/dialog-view` imports (or alongside the existing `./utils/slice` imports):

```ts
import { LINK_ACTION, PROVIDER_LABEL, buildCreateActions } from './components/dialog-view/create-dropdown.util';
```

- [ ] **Step 8.2: Replace `createType` state with `activeAction`**

Find line 82:

```ts
const [createType, setCreateType] = useState('');
```

Replace with:

```ts
const [activeAction, setActiveAction] = useState<CreateAction>(LINK_ACTION);
```

- [ ] **Step 8.3: Add the mutation hooks**

After the existing `useUpdateSliceStateMutation` line (around line 71), add:

```ts
const [createExternalIssue] = useCreateExternalIssueMutation();
const [createGithubIssue] = useCreateGithubIssueMutation();
```

- [ ] **Step 8.4: Compute `effectiveWorkspaceId` and fetch integrations + linked repos**

After the existing `workspace` memo (around line 104-107), add:

```ts
const effectiveWorkspaceId = workspaceId || workspace?.id || '';

const { data: integrations } = useGetIntegrationsByWorkspaceIdQuery(
  { workspaceId: effectiveWorkspaceId },
  { skip: isGuest || !effectiveWorkspaceId },
);

const { data: linkedRepos } = useGetLinkedGithubReposQuery(
  { workspaceId: effectiveWorkspaceId },
  { skip: isGuest || !effectiveWorkspaceId },
);

const createActions = useMemo(
  () =>
    buildCreateActions({
      integrations,
      linkedRepos,
      isGuest,
      workspaceId: effectiveWorkspaceId,
    }),
  [integrations, linkedRepos, isGuest, effectiveWorkspaceId],
);
```

- [ ] **Step 8.5: Reset `activeAction` when it disappears from the list**

After the `createActions` memo, add:

```ts
useEffect(() => {
  if (!createActions.some(action => action.key === activeAction.key)) {
    setActiveAction(LINK_ACTION);
  }
}, [createActions, activeAction.key]);
```

- [ ] **Step 8.6: Replace `handleOnCreateType`**

Find `handleOnCreateType` (around line 146):

```ts
const handleOnCreateType = (type: string) => setCreateType(type);
```

Replace with:

```ts
const handleOnCreateType = (action: CreateAction) => setActiveAction(action);
```

- [ ] **Step 8.7: Rewrite `handleOnCreate`**

Locate `handleOnCreate` (line 170-274). Replace the entire function body with:

```ts
const handleOnCreate = async ({ labels, priority, attachments, description, spaceId }: HandleOnCreateArgs) => {
  if (isCreateLoading) return;

  setIsCreateLoading(true);

  let recordedVideoFile = null;
  let eventsFile = null;
  try {
    if (video?.blob && trim) {
      const { file } = await prepareRecordedVideo({ video, format: 'webm', trim });
      recordedVideoFile = file;
    }

    if (events?.length) {
      eventsFile = await buildEventsFile({ events, range: rrwebTrim });
    }

    const attachedFiles = toArray<File>(attachments);
    const [recordsFile, screenshotsFiles] = await Promise.all([
      buildRecordsFile(),
      buildScreenshotsFiles(screenshots),
    ]);

    if (!recordsFile) {
      toast.error(t('failedToCreateRecords'));
      return;
    }

    for (const file of [...screenshotsFiles, ...attachedFiles]) {
      const isOverSizeLimit = validateMaxFileSize(file);

      if (isOverSizeLimit) {
        toast.error(t('fileTooLarge', file.name));
        return;
      }
    }

    const payload = {
      priority,
      ...(title ? { summary: title } : {}),
      ...(description ? { description } : {}),
      ...(labels?.length ? { labels } : {}),
      ...(effectiveWorkspaceId ? { workspaceId: effectiveWorkspaceId } : {}),
      ...(spaceId ? { spaceId } : {}),
      screenshots: screenshots.map((f: Screenshot, idx: number) => ({ name: f.name, order: idx })),
      attachments: attachedFiles.map((f: File, idx: number) => ({ name: f.name, order: idx })),
      includeRecords: true,
      includeVideo: !!recordedVideoFile,
      includeEvents: !!eventsFile,
      includeAnnotations: false,
    } as InitSliceRequest;

    const { draft: slice, uploaded } = await runSliceCreationFlow({
      dispatch,
      onProgress: setProgress,
      idempotencyKey,
      payload,
      files: {
        screenshots: screenshotsFiles,
        attachments: attachedFiles,
        records: recordsFile,
        ...(recordedVideoFile ? { video: recordedVideoFile } : {}),
        ...(eventsFile ? { events: eventsFile } : {}),
      },
    });

    if (slice?.externalId || slice?.id) {
      // Narrow slice.id for the tracker branches (the outer guard accepts externalId-only too)
      if (!slice.id) {
        toast(t('openReport'));
        if (slice.externalId) safeOpenNewTab(`${APP_BASE_URL}/s/${slice.externalId}`);
        await finalizeCreation(undefined, uploaded);
        return;
      }

      const briePath = isGuest ? `s/${slice.externalId}` : `slices/${slice.id}`;

      if (activeAction.key === 'link') {
        toast(t('openReport'));
        safeOpenNewTab(`${APP_BASE_URL}/${briePath}`);
        await finalizeCreation(slice?.id, uploaded);
        return;
      }

      try {
        let trackerUrl: string;

        if (activeAction.key === 'github') {
          const result = await createGithubIssue({
            workspaceId: activeAction.workspaceId,
            sliceId: slice.id,
            repositoryId: activeAction.repositoryId,
          }).unwrap();
          trackerUrl = result.url;
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
          };
          const result = await createExternalIssue({
            integrationId: activeAction.integrationId,
            body,
          }).unwrap();
          trackerUrl = result.url;
        }

        toast.success(t('createdInTracker', PROVIDER_LABEL[activeAction.key]));
        safeOpenNewTab(trackerUrl);
        await finalizeCreation(slice?.id, uploaded);
      } catch (trackerErr) {
        console.error('[OnCreate Tracker Error]', trackerErr);
        toast.error(t('trackerSendFailedFallback', PROVIDER_LABEL[activeAction.key]));
        safeOpenNewTab(`${APP_BASE_URL}/${briePath}`);
        await finalizeCreation(slice?.id, uploaded);
      }

      return;
    }

    toast.error(t(slice?.message) || t('failedToCreateSlice'));

    if (slice?.id) {
      await updateSliceState({ id: slice.id, state: SliceState.CANCELED });
    }
  } catch (error: any) {
    console.error('[OnCreate Error]:', error);
    toast.error(t('unexpectedError'));
  } finally {
    setIsCreateLoading(false);
  }
};
```

Notes on what changed vs. the original:
- Guard is now only `isCreateLoading` (the `createType !== 'link'` short-circuit is gone).
- Payload uses `effectiveWorkspaceId`, not `workspaceId` directly. This is an intentional improvement: previously, if the user hadn't picked a workspace via the header dropdown (i.e. `workspaceId === ''`), the `InitSliceRequest` would omit `workspaceId` and the server would resolve a default. Now we resolve the default client-side first — same outcome in the common case, but the tracker branch *requires* a concrete `workspaceId` for the `body.workspaceId` field in `POST /slices/external`, so we cannot defer to the server here.
- `toast.error(t(slice?.message) || t('failedToCreateSlice'))` is preserved verbatim from the original. `message` is not on `InitSliceResponse`'s declared type, but the existing code reads it without a type error — this works because `runSliceCreationFlow` returns a type that doesn't strictly narrow the draft (`as any`-ish at the boundary). Keep the line as-is to preserve behavior.
- New non-link branch guard: `if (!slice.id)` early-returns to the link path; the tracker mutations require a concrete slice id.
- After slice creation, the function branches on `activeAction.key` and dispatches the right mutation.
- Tracker success → toast + redirect to `trackerUrl`.
- Tracker failure → toast `trackerSendFailedFallback` + redirect to Brie slice page (mirror of the link path).
- The outer catch / finalize / progress reset all remain unchanged in behavior.

- [ ] **Step 8.8: Update the `<Header>` call site**

Around line 367 (`onCreate={handleOnCreateType}`), update the `<Header>` JSX to pass the new props. Look for the line that already passes `onCreate={handleOnCreateType}` and add the two new props alongside it:

```tsx
<Header
  // ... existing props unchanged ...
  createActions={createActions}
  activeCreateAction={activeAction}
  onCreate={handleOnCreateType}
  // ... rest ...
/>
```

- [ ] **Step 8.9: Verify no stale `createType` references**

Run from `brie-extension/`:

```bash
grep -n "createType" pages/content-ui/src/content.tsx
```

Expected: zero matches. If any remain, replace each with the equivalent `activeAction.key` (or remove if dead).

- [ ] **Step 8.10: Type-check and lint**

```bash
pnpm type-check
pnpm lint
```

Expected: PASS — no errors. If the lint reports unused imports (e.g. `useState`, `useEffect`, `useMemo` from React), keep them — they're all used now.

- [ ] **Step 8.11: Consolidated commit for Tasks 6 + 7 + 8**

All three files (dropdown, Header, content.tsx) form one atomic refactor — committing them together keeps each commit's type-check green. Stage all three modified files in one commit:

```bash
git add \
  pages/content-ui/src/components/dialog-view/create-dropdown.ui.tsx \
  pages/content-ui/src/components/annotation-view/ui/header.ui.tsx \
  pages/content-ui/src/content.tsx
git commit -m "feat(content-ui): tracker dropdown — controlled props + integrations dispatch"
```

---

## Task 9: Build verification

**Files:** none (verification only).

- [ ] **Step 9.1: Production-style build for Chrome**

```bash
pnpm build:chrome:production
```

Expected: exits 0. No type errors. No "Icon ... does not exist" console output in the build logs.

- [ ] **Step 9.2: Lint full repo**

```bash
pnpm lint
```

Expected: zero errors. Warnings acceptable if pre-existing.

- [ ] **Step 9.3: Type-check full monorepo**

```bash
pnpm type-check
```

Expected: PASS across all packages.

- [ ] **Step 9.4: Commit (only if anything changed during verification — likely nothing)**

If lint auto-fix touched anything: stage and commit. Otherwise skip.

---

## Task 10: Manual browser verification

**Files:** none.

content-ui has no automated tests. Verify the flow in a real Chrome session.

- [ ] **Step 10.1: Start dev server**

```bash
pnpm run:chrome:local
```

- [ ] **Step 10.2: Load the unpacked extension**

In Chrome → `chrome://extensions` → enable Developer Mode → "Load unpacked" → select `brie-extension/dist`.

- [ ] **Step 10.3: Test matrix — run each case and record pass/fail**

Use the staging API (whichever the local `.env.development` points to). For each case below, capture a screenshot if it fails.

1. **Guest user**: open the modal as a guest (sign out). Dropdown shows only "Create a link" + the "More integration coming soon..." footer. Open DevTools → Network: no requests to `/workspaces/*/integrations` or `/integrations/*/github/repositories/linked`.
2. **Authenticated, workspace with no integrations**: same as (1) — `link` only + footer.
3. **Workspace with Linear connected**: dropdown shows `Create in Linear` row, enabled, with the blue Linear logo. Selecting it + submit → a Brie slice is created AND a Linear issue is created → new tab opens to the Linear issue URL.
4. **Workspace with Jira connected**: same as (3) for Jira → new tab opens to `<site>.atlassian.net/browse/<KEY>`.
5. **Workspace with GitHub connected, no linked repos**: GitHub row is NOT shown.
6. **Workspace with GitHub connected + at least one linked repo**: `Create in GitHub` row appears. Submit → issue created against the first linked repo → new tab opens to the GitHub issue URL.
7. **All three connected**: all three rows visible; `Create a link` is default-selected (the main button shows "Create a link"); footer is NOT shown.
8. **Tracker mutation fails**: in DevTools, block `POST /slices/external` with a 500 response (use the Network conditions panel, "Block request URL"). Submit with `Create in Linear` selected → toast reads "Slice saved. Couldn't send to Linear — opening Brie." → new tab opens to the Brie slice page → the slice IS present in Brie.
9. **Switch workspaces while modal open**: connect Linear in workspace A; do not connect anything in workspace B. Open the modal in workspace A, select `Create in Linear`, switch to workspace B via the header dropdown → the `activeAction` resets to `Create a link`; the `Create in Linear` row disappears.
10. **`workspaceId` empty edge case**: as a freshly signed-in user before org bootstrap completes (or with the workspace dropdown forced to "no selection" via Chrome DevTools — use the React DevTools to set the `workspaceId` state to `''` and the `workspace` memo to `undefined`), confirm no network calls fire to `/workspaces/*/integrations` or `/integrations/*/github/repositories/linked`, and the dropdown shows only `Create a link` + footer. No source-code changes required.

- [ ] **Step 10.4: Document any defects**

If any case fails, open a defect note in `brie-extension/docs/superpowers/plans/2026-05-19-content-ui-tracker-dropdown-defects.md` with case number, expected vs actual, and a screenshot path. Fix the defect in-place (modifying the relevant file from earlier tasks) and re-run the failing case. Do not move on until 10/10 cases pass.

- [ ] **Step 10.5: Final commit (if defects were fixed)**

If fixes were made:

```bash
git add <files-touched>
git commit -m "fix(content-ui): resolve manual-QA defects for tracker dropdown"
```

If no defects: skip.

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Spec § Architecture (3 layers) → Tasks 1-2 (store), 3 (icons), 5-7 (dropdown), 8 (content.tsx)
- ✅ Spec § Components & Interfaces (`integrations.types.ts`, `integrations.api.ts`, `CreateAction`, props) → Tasks 1, 2, 5, 6
- ✅ Spec § content.tsx changes (state, queries, payload sourcing from local state, guest short-circuit, dispatch + fallback) → Task 8
- ✅ Spec § Error Handling matrix → Task 8 (try/catch around tracker mutation; outer catch unchanged) + manual case 8
- ✅ Spec § Testing matrix → Task 10 (10 manual cases, including new guest + empty-workspaceId)
- ✅ Spec § i18n keys → Task 4
- ✅ Spec § Icon decision → Task 3 (real LinearIcon + JiraIcon in customIcons; GithubIcon from Lucide)
- ✅ Spec § Open Risks (workspaceId on connection response) → Task 5 builder threads `workspaceId` parameter through, sidestepping the type uncertainty
- ✅ Decisions locked Q1-Q6 → all reflected in Task 5 (filter) + Task 6 (no disabled) + Task 8 (default link, success URL, failure fallback, silent integrations fallback)

**Type consistency check:** `CreateAction` discriminated union is defined once in `integrations.types.ts` (Task 1), exported from `@extension/store` (Task 2), and consumed identically in the util (Task 5), the dropdown (Task 6), the Header (Task 7), and `content.tsx` (Task 8). `LINK_ACTION` and `PROVIDER_LABEL` are defined once in the util (Task 5) and imported in `content.tsx` (Task 8). No duplicate or drifting names.

**Placeholder scan:** No `TODO` / `TBD` / "implement later" in any step. Every code step contains the complete code to paste. Step 10.4 references a defect-tracking file path that exists only if defects are found — that's not a placeholder, it's a conditional follow-up.
