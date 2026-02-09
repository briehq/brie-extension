# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Brie is a Chrome/Firefox browser extension for capturing screenshots, console errors, network issues, and user actions for bug reporting. It includes session recording (rrweb), video capture (FFmpeg WASM), and screenshot annotation (fabric.js).

## Commands

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Development (Chrome)
pnpm run:chrome:local

# Development (Firefox)
pnpm run:firefox:local

# Production build
pnpm build:chrome:production
pnpm build:firefox:production

# Lint & format
pnpm lint
pnpm lint:fix
pnpm format

# Type checking
pnpm type-check

# Package extension
pnpm zip                  # Chrome
pnpm zip:firefox          # Firefox

# E2E tests
pnpm e2e

# Bump version across all packages
pnpm update-version
```

Command pattern: `pnpm <action>:<scope>:<env>` where action=`run|build`, scope=`chrome|firefox`, env=`local|production`.

## Architecture

This is a **pnpm monorepo** orchestrated by **Turborepo** with **Vite** as the build tool.

### Extension entry points (5 separate builds)

| Entry | Location | Purpose |
|-------|----------|---------|
| **Background** | `chrome-extension/src/background/` | Service worker: tab events, web request interception, context menus, message routing |
| **Content** | `pages/content/` | Injected at `document_start`: rrweb session recording, early DOM access |
| **Content UI** | `pages/content-ui/` | React app injected into pages: annotation editor, rrweb player, FFmpeg video encoding |
| **Content Runtime** | `pages/content-runtime/` | Dynamically injected scripts from popup |
| **Popup** | `pages/popup/` | React app: user auth, capture controls, settings |

### Shared packages (`packages/`)

| Package | Purpose |
|---------|---------|
| `shared` | Types, hooks, constants shared across all entry points |
| `storage` | Chrome Storage API helpers with reactive state |
| `store` | Redux store (`@reduxjs/toolkit`), hooks for user/org/subscription data |
| `env` | Environment variable management (dotenvx-based) |
| `i18n` | Type-safe internationalization (14+ languages) |
| `ui` | Radix UI + TailwindCSS component library |
| `tailwindcss-config` | Shared Tailwind configuration |
| `tsconfig` | Shared TypeScript configs |
| `vite-config` | Shared Vite build helpers |
| `hmr` | Custom HMR plugin for extension development |
| `dev-utils` | Manifest parser, logger |
| `zipper` | Extension packaging to zip |

### Key communication pattern

Background ↔ Content/Popup communication uses `chrome.runtime.onMessage` / `chrome.runtime.sendMessage` with typed message handlers in service files.

### State management

- **Redux** (`@extension/store`) for app-level state (user, organization, subscription)
- **Chrome Storage API** (`@extension/storage`) for extension persistence with reactive hooks: `useStorage<BaseStorage<T>>(storageInstance)`

## Tech Stack

- React 19, TypeScript 5.8, Vite 6, TailwindCSS 3
- Radix UI components, fabric.js (canvas), html2canvas (screenshots)
- rrweb 2.0.0-alpha.4 (session recording), @ffmpeg/ffmpeg (video encoding)
- ESLint 9 (flat config), Prettier, Husky + lint-staged

## Conventions

- **File/folder naming:** kebab-case
- **File suffixes:** `.util.ts`, `.service.ts`, `.interface.ts`, `.data.ts`, `.spec.ts`, `.hook.ts`, `.enum.ts`, `.ui.tsx`, `.po.ts`
- **Imports:** All packages use `@extension/*` aliases (e.g., `@extension/shared`, `@extension/store`)
- **Within chrome-extension:** Use `@src/*` path alias
- **Commit messages:** `<type>[(scope)]: <description>` — types: `feat`, `fix`, `refactor`, `docs`, `build`, `ci`, `chore`
- **Branch naming:** `feature/<scope>`, `fix/<scope>`, `docs/<scope>`
- **Prettier:** 120 char width, single quotes, trailing commas, no arrow parens

## Build Notes

- Manifest is generated from `chrome-extension/manifest.ts` (not a static JSON file)
- Environment files: `.env`, `.env.development`, `.env.production`; variables prefixed with `CLI_` are globally available via Turbo
- The `dist/` directory is the unpacked extension loaded into the browser during development
- Content UI has its own TailwindCSS build output to avoid style conflicts with host pages
- FFmpeg WASM and rrweb assets are listed as web-accessible resources in the manifest
