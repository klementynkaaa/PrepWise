# Architecture

## Overview

PREPWISE is an installable web app (PWA). It is built with Next.js and shipped as a **static export**: plain HTML, CSS and JS with no server at runtime. A service worker saves the whole app on the device after the first online visit. From then on it works the same with or without a connection.

```
browser ── first visit (online) ──▶ static host (Vercel)
   │                                   └─ HTML/CSS/JS + sw.js
   ├─ service worker: precaches every file, serves them offline
   └─ IndexedDB: household profile, plan state, ticked items (never leaves the device)
```

## Stack

| Area      | Choice                                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict)                                                                                                                   |
| Styling   | Tailwind CSS 4 with the PREPWISE design system tokens; Plus Jakarta Sans, self-hosted                                                                                    |
| Offline   | Serwist service worker, built after the static export                                                                                                                    |
| Storage   | IndexedDB on the device (planned: one typed storage module)                                                                                                              |
| Hosting   | Vercel (static files)                                                                                                                                                    |
| CI/CD     | GitHub Actions (`.github/workflows/ci.yml`): every quality gate on every PR; `develop` → Vercel preview, `main` → staged production, smoke check, approval, promote, tag |

## Key decisions

- **PWA instead of native apps.** One codebase, installable from the browser, and no app store review.
- **Static export, no backend.** Household data must never leave the device and there are no accounts, so a server has nothing to do. Server-only Next.js features are off-limits: Server Actions, request-based Route Handlers, cookies or headers, proxy/middleware, ISR, and the default image optimizer. See `AGENTS.md` for the full list.
- **Next.js over a lighter client-only option.** Chosen for popularity and tooling. The trade-off: agents tend to reach for server features by default, so the restrictions are written into `AGENTS.md`.
- **Content ships with the app.** Plan content and quantity rules are bundled as static data and never fetched at runtime, so they are available during a blackout.
- **`cacheComponents` is disabled.** It conflicts with the `force-static` route config that static export requires.

## Offline behaviour

- **Precache:** `scripts/build-sw.mjs` runs after `next build`. It saves every file in `out/` (pages, route payloads, assets, icons) and bundles `src/sw.ts` into `out/sw.js`.
- **Pages:** they are served from the cache first. This includes Next.js in-app navigation requests (the `_rsc` parameter is ignored when matching).
- **Updates:** while online, a new deployment's service worker installs in the background and takes over immediately.
- **Fallback:** any page not saved on the device shows a Polish offline page (`/offline`).
- **First visit:** the app needs one online visit before it can work offline.

## Design system

- **Tokens** live in `src/app/globals.css` (`@theme`). Tailwind's default colours, text sizes, radii, shadows and fonts are removed, so only system values exist. The source of truth is the PREPWISE Design System; a missing value is added there first.
- **Components** live in `src/components/ui/` (import from `@/components/ui`). Most render on the server with no client JS; only interactive ones (stepper, choices, checklist, tab bar, sheet, undo) are Client Components.
- **Storybook** is the component showcase: every component and state has a story (`npm run storybook`). `npm run test:storybook` renders every story in Chromium and fails on accessibility violations; CI runs it. Storybook is a dev tool and is not part of the exported app.
- **Light theme only.** Every screen is one phone-width column, capped at 32rem and centred.
- **Large text:** plan, progress and checklist rows stack by their own width (container queries), not by screen width.
- **Duplicated value:** the `bg` colour `#EFF4F6` is repeated in `src/app/manifest.ts` and `viewport.themeColor` in `src/app/layout.tsx`, because they can't read CSS variables. Change all three together.
- **Illustrations** are static SVGs in `public/illustrations/`, precached for offline use and always decorative.

## Build and run

```bash
npm run dev      # development server (no service worker)
npm run build    # static export to out/ + service worker
npm start        # serve out/ locally to test the production/offline build
npm run lint
npm run typecheck  # generates Next.js route types, then tsc
npm run format:check
npm test           # unit, integration and component tests (Vitest)
npm run test:coverage  # same, with the coverage floor
npm run test:e2e   # browser tests (Playwright); needs a prior npm run build
npm run storybook       # component showcase on http://localhost:6006
npm run test:storybook  # every story in Chromium, with accessibility checks
```

## Deployment

GitHub Actions deploys with the Vercel CLI, and never rebuilds the app for a deployment. The tested `out/` (the artifact the browser tests ran against) is turned into `.vercel/output` by `scripts/vercel-output.mjs`, then shipped with `vercel pull` → `vercel deploy --prebuilt`. `vercel.json` makes Vercel serve the files as plain static files, with clean URLs and no caching for `sw.js`; the same rules are carried into the generated output. It also turns off Vercel's own Git deployments, so each merge deploys exactly once. `404.html` stays reachable (it is not redirected), because the service worker precaches it.

- **`develop`:** a Vercel preview deployment.
- **`main`:** a staged production deployment (`--prod --skip-domain`, not on the production domain), then smoke and health checks against it, then the owner's approval in the `production` GitHub environment, then a promote through the Vercel REST API (`scripts/vercel-promote.mjs`; the CLI's `vercel promote` fails for this token), which assigns the production domain without rebuilding. A health check on the production domain and a release tag follow. See `docs/development-process.md`.
- **`version.json`:** every build writes `out/version.json` with the commit SHA. The health check compares it with the commit being released, which proves which version a URL serves. It is not precached, so it is always read from the network.

## Localisation and accessibility

The UI is in Polish (`<html lang="pl">`). Fonts are self-hosted with Polish characters. Layouts must hold up at large system font sizes and work with a screen reader.
