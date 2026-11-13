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

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS 4 |
| Offline | Serwist service worker, built after the static export |
| Storage | IndexedDB on the device (planned: one typed storage module) |
| Hosting | Vercel (static files) |
| CI/CD | GitHub Actions, auto-deploy on merge to `main` (planned) |

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

## Build and run

```bash
npm run dev      # development server (no service worker)
npm run build    # static export to out/ + service worker
npm start        # serve out/ locally to test the production/offline build
npm run lint
```

## Localisation and accessibility

The UI is in Polish (`<html lang="pl">`). Fonts are self-hosted with Polish characters. Layouts must hold up at large system font sizes and work with a screen reader.
