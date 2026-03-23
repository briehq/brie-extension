# Brie: Prioritized Backlog

> Organized from "App Ideas & Bugs.md" — only **open items** included.
> Last triaged: 2026-03-16

---

## Bugs (by priority)

### Critical / High

| Done | # | Area | Description | Version |
|------|---|------|-------------|---------|
| [ ] | 1 | EXT | Token expiry bug — extension asks to login, app has waiting toast promise causing redirect loop back to extension as login event | v0.5.0+ |
| [ ] | 2 | EXT | Popup after login not updating — auth page stays visible | v0.5.0+ |
| [ ] | 3 | EXT | `take screenshot -> edit -> add attachments/description/labels -> minimize -> edit` => data lost, all cleaned | v0.5.0+ |
| [ ] | 4 | EXT | Drag-and-drop reopen popup doesn't restrict user from reselecting | v0.5.0+ |
| [ ] | 5 | EXT | Only click on drag-and-drop doesn't take full screen image | v0.5.0+ |
| [ ] | 6 | EXT | Video: mp4 export fails / gives error on open | v0.6.35 |
| [ ] | 7 | EXT | Video: if no trim, video has no duration | v0.6.35 |
| [ ] | 8 | EXT | Video: mp4 fails to be exported | v0.6.35 |
| [ ] | 9 | APP & EXT | Logout in app — what happens in extension? Same when refresh token expires | v0.5.0+ |
| [ ] | 10 | EXT | REDACTED_BY_BRIE/2025 issue with calendar date inputs | v0.5.0+ |
| [ ] | 11 | EXT | Events — duplicated calendar, toggle and checkbox inputs (test on different sites) | v0.5.0+ |
| [ ] | 12 | BE, FE & EXT | Incorrect HTTP status codes — some places return 200 OK when they shouldn't | v0.5.0+ |

### Medium

| Done | # | Area | Description | Version |
|------|---|------|-------------|---------|
| [ ] | 13 | EXT | #156 — website styling breaks on YC, LinkedIn | v0.3.2 |
| [ ] | 14 | EXT | #164 — user actions/events captured in extension context | v0.4.0 |
| [ ] | 15 | EXT | Breaks: Edge overview, GoDaddy login, ChatGPT animations | v0.5.0+ |
| [ ] | 16 | EXT | Full screen capture doesn't work on some sites (ChatGPT) | v0.5.0+ |
| [ ] | 17 | EXT | Screenshot takes too long — needs skeleton placeholder | v0.5.0+ |
| [ ] | 18 | EXT | (Annotation) resize event makes screenshot smaller on drag-and-drop (#38) | misc |
| [ ] | 19 | EXT | Select cursor not changing on Firefox (#28) | misc |
| [ ] | 20 | EXT | Zoom level metadata is wrong (#37, #561) | misc |
| [ ] | 21 | EXT | Export image — output resolution is disabled | v0.5.0+ |
| [ ] | 22 | APP | Use slice state prop to display errors; if attachment upload fails, show why | v0.5.0+ |
| [ ] | 23 | EXT | Upload attachment — missing size validation | v0.5.0+ |
| [ ] | 24 | APP | Dot and text alignment issue on mobile | testing |
| [ ] | 25 | APP | Improve annotations issues from testing | testing |

### Low

| Done | # | Area | Description | Version |
|------|---|------|-------------|---------|
| [ ] | 26 | EXT | Close popup after login success (currently no) | v0.5.35 |
| [ ] | 27 | EXT & APP | "Typed" in actions should say "Edited" if field already had a value | v0.5.0+ |
| [ ] | 28 | EXT | EXT & APP: use placeholder if no label is present | v0.5.0+ |
| [ ] | 29 | EXT | Collect errors (error reporting) | v0.5.0+ |

---

## Features (by priority)

### P0 — Revenue & Growth (goal: increase customers)

| Done | # | Area | Description | Notes |
|------|---|------|-------------|-------|
| [ ] | 1 | APP | OAuth login: Google, GitHub, Phone | v0.6.xx |
| [ ] | 2 | APP | Slice details page redesign | v0.6.xx |
| [ ] | 3 | EXT | Security audit (EXT pending; FE & BE done) | v0.6.xx |
| [ ] | 4 | AUTH | E2E, unit & integration tests for auth | v0.6.xx |
| [ ] | 5 | PLANS | E2E, unit & integration tests for plans & subscriptions | v0.6.xx |
| [ ] | 6 | MARKETING | Apollo campaign — ask for feedback, give lifetime free, target big tech | v0.6.xx |
| [ ] | 7 | MARKETING | Extension store assets: logo, screenshots, video | v0.6.xx |
| [ ] | 8 | MARKETING | Backlinks, Reddit presence, Docs site | v0.6.xx |
| [ ] | 9 | EXT | On update/install — use public metrics for CTA landing (like ad blocker extensions) | v0.6.xx |

### P1 — Core Product

| Done | # | Area | Description | Notes |
|------|---|------|-------------|-------|
| [ ] | 10 | EXT, FE, BE | Session replay — NPM/script integration, auto-create slice on 400+ status or error log | v0.6.35 |
| [ ] | 11 | EXT, FE, BE | Integrations: Linear two-way sync (status, fields mapping, update endpoint) | v0.5.35 |
| [ ] | 12 | EXT, FE, BE | Integrations: Jira, Azure | v0.5.30+ |
| [ ] | 13 | BE & FE | MCP — use slice public page as AI content feed | v0.6.35+ |
| [ ] | 14 | APP | Recording links — send a link to record without installing extension | v0.6.35+ |
| [ ] | 15 | BE & FE | Alert about issues — email (priority), Slack | v0.6.35 |
| [ ] | 16 | BE & FE | Generate fix — implement OAuth to create PRs on behalf of user | v0.6.35 |
| [ ] | 17 | EXT | Video recording: redo/undo/reset history | v0.6.35 |
| [ ] | 18 | APP, BE | Create test cases from repro steps, assign ticket, allow annotated screenshots, export to Linear/Jira/AzDO | v0.5.30+ |

### P2 — User Experience

| Done | # | Area | Description | Notes |
|------|---|------|-------------|-------|
| [ ] | 19 | EXT | Keyboard shortcuts (#171) — OS-aware display, tooltips, ESC default, Chrome commands API | Ideas |
| [ ] | 20 | EXT | Blur tool for annotations (#70) | Ideas |
| [ ] | 21 | EXT | Safari support (#172) | Ideas |
| [ ] | 22 | EXT | Microphone — permission guide, toggle in popup/toolbar | v0.5.0+ |
| [ ] | 23 | EXT | Redesign use-case views from popup (refresh, internal page, guards) | v0.5.0+ |
| [ ] | 24 | EXT | Share link auto-copied to clipboard for Slack/Jira/Linear/email | v0.5.0+ |
| [ ] | 25 | APP | Login "Last used" method badge | v0.5.0+ |
| [ ] | 26 | EXT | Pagination for Slices History (default 5, sticky top) | Ideas |
| [ ] | 27 | FE, BE | Activity graph (like GitHub) for reported bugs | Ideas |
| [ ] | 28 | FE, BE | Mark slices private/public (account required) | Ideas |
| [ ] | 29 | FE, BE | Public slices — share via email, team members | v0.5.0+ |
| [ ] | 30 | EXT | Dark mode for content UI | v0.5.0+ |
| [ ] | 31 | EXT | Zoom range: -20 to +100 in annotation view | v0.5.0+ |
| [ ] | 32 | EXT | Crop image tool | v0.5.0+ |
| [ ] | 33 | EXT | Custom cursor based on tool selection | v0.5.0+ |
| [ ] | 34 | EXT | Text size change via drag-and-drop shape controls | v0.5.0+ |
| [ ] | 35 | EXT | Simulate macOS screenshot edit behavior (keep shape tool active) | v0.5.0+ |
| [ ] | 36 | EXT | Mobile content UI: bottom menus, sidebar toggle logic | v0.5.0+ |
| [ ] | 37 | EXT | Add maximize/minimize to description or sidebars | v0.5.0+ |
| [ ] | 38 | EXT | Add folder search (by name, default is 10 records) | v0.5.0+ |
| [ ] | 39 | APP | Price page (reference: reshaped.so/pricing) | v0.5.0+ |
| [ ] | 40 | APP | Posthog-style onboarding — configure capture (logs, networks, etc.) | v0.5.0+ |
| [ ] | 41 | APP | Make preview mode more polished (dubco news style) | v0.5.0+ |

### P3 — Platform & Expansion

| Done | # | Area | Description | Notes |
|------|---|------|-------------|-------|
| [ ] | 42 | EXT | Offline mode — save issues internally, sync when online | Ideas |
| [ ] | 43 | SDK | JavaScript SDK — control widget via JS, pass custom metadata | Ideas |
| [ ] | 44 | SDK | Auto-capture issues when client errors occur (collect events/requests before issue) | Ideas |
| [ ] | 45 | EXT | Full page screenshot via external API (screenshotone) | Ideas |
| [ ] | 46 | WEB | Browser download page (like adblockplus.org/download) | Ideas |
| [ ] | 47 | EXT & FE | Inspectable screenshots | 0.x.x |
| [ ] | 48 | FE, BE | Create defect/bug/story/feature/epic from generated report | 0.x.x |
| [ ] | 49 | APP | Support other platforms: Mac, Windows, iOS, Android | Ideas |
| [ ] | 50 | EXT | Export/Upload HAR file | Ideas |
| [ ] | 51 | EXT | Allow user to intercept and edit requests (like Requestly) | v0.5.0+ |
| [ ] | 52 | APP | Recording links for external users (no install) | v0.6.35+ |

### P4 — Future / Nice-to-Have

| Done | # | Area | Description | Notes |
|------|---|------|-------------|-------|
| [ ] | 53 | EXT | Configurable recording times (context: 2min, instant: 30s-2min, video: infinite) | Ideas |
| [ ] | 54 | APP | Token/credit spending system (like OpenAI) | Ideas |
| [ ] | 55 | APP | Rewards system | Ideas |
| [ ] | 56 | EXT | Shadow DOM for screenshot feature (#27) | misc |
| [ ] | 57 | FE, BE | FE-BE hasFeature hook for feature gating | Ideas |
| [ ] | 58 | EXT | Tagging work items/stories — QA team can demonstrate ticket tested | Ideas |
| [ ] | 59 | EXT & FE | Include/exclude details in report, leave just screenshots | Ideas |
| [ ] | 60 | BE | If no bugs created for X days, send help email | v0.5.0+ |
| [ ] | 61 | BE & FE & EXT | Audit logs — view all team workspace actions | v0.5.0+ |
| [ ] | 62 | EXT | Custom component to prevent leaving annotation views | misc |
| [ ] | 63 | APP | Daily tips (like GitHub, in footer) | v0.5.0+ |
| [ ] | 64 | APP | Web transitions/animations | v0.5.0+ |
| [ ] | 65 | BE | Notifications service (new account, demo email login, new payment) | v0.5.0+ |
| [ ] | 66 | LP | Add Help, Blog, and Docs pages | v0.5.30+ |
| [ ] | 67 | EXT, BE, FE | Welcome letter after installing extension | 0.x.x |
| [ ] | 68 | EXT & FE | "Why go premium" page for guest users | 0.x.x |
| [ ] | 69 | EXT, FE | Upgrade button for guests when limit reached | 0.x.x |
| [ ] | 70 | APP | On remove — "sorry to see you go" feedback form | 0.x.x |

### Phase 1.2+ (Long-term)

| Done | # | Area | Description |
|------|---|------|-------------|
| [ ] | 71 | BE | Remove guest slices after 7 days |
| [ ] | 72 | EXT | Crop tool for screenshots |
| [ ] | 73 | EXT | Voice integration — notes, transcription, run command |
| [ ] | 74 | EXT | Ticket integration to check AC while testing |
| [ ] | 75 | EXT | Linear agent — auto-assign, investigate, fix bugs |

---

## Tech Debt (by priority)

### High

| Done | # | Area | Description |
|------|---|------|-------------|
| [ ] | 1 | EXT | Refactor to use rrweb for capturing logs, user actions, etc. |
| [ ] | 2 | EXT | Migrate to debugger API (Chrome DevTools Protocol alternative in MV3) — DOMSnapshot, cookies, logs, networks. Chrome-only. |
| [ ] | 3 | EXT | Create safe `sendMessage` wrapper and refactor |
| [ ] | 4 | EXT | Guests vs Accounts — create hook/permissions system, document feature matrix |
| [ ] | 5 | APP | Migrate app project to Next.js or TanStack |
| [ ] | 6 | BE, FE & EXT | Fix HTTP status codes across all endpoints |

### Medium

| Done | # | Area | Description |
|------|---|------|-------------|
| [ ] | 7 | EXT | Add tests: auth, repro steps, edit sensitive info |
| [ ] | 8 | EXT | Unit tests for primary workflows (#39) — list all important flows by action |
| [ ] | 9 | FE | Generate E2E test scripts (Playwright) |
| [ ] | 10 | EXT, FE, BE | Add JSDoc documentation |
| [ ] | 11 | EXT | Network API exploration (devtools/network) — HAR download (only when DevTools open) |
| [ ] | 12 | EXT & BE | Assets: restrict 10 shots/attachments default, restrict formats, restrict size, validate MIME/size server-side, async AV scan, cleanup cron for canceled/draft slices |
| [ ] | 13 | EXT & BE | Guest refresh token expiration handling |
| [ ] | 14 | EXT | Network requests: add missing statistics (like Chrome network tab) |
| [ ] | 15 | ALL | Optimization/performance/code-split (million.dev, react-scan, babel-plugin-react-compiler) |

### Low

| Done | # | Area | Description |
|------|---|------|-------------|
| [ ] | 16 | RESEARCH | Replace logs with Datadog or reporting logs service |
| [ ] | 17 | BE | Secure records.json file |
| [ ] | 18 | BE | Migrate to Resend for direct communication (welcome emails) |
| [ ] | 19 | SERVER | Update PM2 to latest version |
| [ ] | 20 | REPO | Add Greptile for PR review (sponsored?) |
| [ ] | 21 | EXT | Chrome Web Store best practices badge |
| [ ] | 22 | ALL | Fix existing lint warnings per package (`ppm lint:fix`) |
| [ ] | 23 | ALL | Update design assets (built by designer) — Chrome Store listing materials |
| [ ] | 24 | EXT | Adapt redesign for guest accounts — guard component with popup/tooltip for FREE/PRO features, restrict/protect backend |
| [ ] | 25 | EXT, FE | Capture full screenshot + send position/size to BE (enables post-edit annotations) |
| [ ] | 26 | EXT, FE | Capture annotation shape objects (enables edit annotations) |
| [ ] | 27 | APP | Refactor report view using new design |
| [ ] | 28 | EXT | Remove guest-related slice/deletedAt logic if guest mode not implemented |
| [ ] | 29 | APP & BE | No access to unauthorized workspaces/slices |
| [ ] | 30 | APP | Remove left/back to open tab — move under settings; or emit online/offline + 44s inactivity |
| [ ] | 31 | EXT | Develop dedicated mobile version of content UI |
| [ ] | 32 | APP | Refactor to modern web app architecture |
| [ ] | 33 | EXT | Select area + open popup capture option conflict — disable |
| [ ] | 34 | EXT, FE, BE | Limit requests to be made just from extension |
| [ ] | 35 | APP | Workspace selection dropdown — update setup integration logic on setup.page |
| [ ] | 36 | EXT | Add auth methods: Gmail, X (Phone done) |
| [ ] | 37 | EXT | Tailwind sponsorship (pending items) |

---

## Competitors (for reference)

- [sonarly.dev](https://sonarly.dev/)
- [betterbugs.io](https://www.betterbugs.io/)
- [Jam.dev](https://jam.dev)
- [Marker.io](https://marker.io)
- [BrowserStack Bug Capture](https://www.browserstack.com/bug-capture)
- [Birdie](https://www.birdie.so/)
- [Requestly SessionBear](https://github.com/requestly/requestly/tree/master/browser-extension/sessionbear)
- [Highlight](https://github.com/highlight/highlight)
- [Dummi](http://dummi.com/)
- [Capture.dev](https://capture.dev/)

---

## Marketing / Growth (non-engineering)

- Contact influencers (small & big) on X and other platforms for viral/trending
- Apollo campaign with feedback + lifetime free offers
- Create animation of person squashing bugs
- Reddit presence
- Backlinks strategy
- Docs site with video tutorials
