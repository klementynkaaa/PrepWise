<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PREPWISE — project rules

PREPWISE is an installable PWA, used online and offline, that helps a household in Poland build an emergency kit. Project docs: `docs/` (product, business rules, architecture). The detailed working notes live in `context/`, which is git-ignored and may be missing in a fresh clone. When they're present, prefer `context/foundation/prd.md` and `context/foundation/tech-stack.md` for detail.

**Keep `docs/` in sync:** when a change alters something `docs/` describes (scope, business rules, architecture, a key decision), update the matching doc in the same change. Keep it high-level. Never copy investor, pricing or monetisation material into `docs/`, because the repo is public.

## Hard constraints (never violate)

1. **Static export only.** The app ships as `output: 'export'` (HTML/CSS/JS in `out/`). There is no Node server at runtime, so do not add anything that needs one:
   - no Server Actions (`'use server'`)
   - no Route Handlers that read the Request; a GET handler is allowed only with `export const dynamic = 'force-static'`
   - no `cookies()`, `headers()`, `proxy.ts`/middleware, rewrites, redirects, custom headers, ISR or Draft Mode
   - no dynamic routes without `generateStaticParams()`, and no `dynamicParams: true`
   - no `next/image` with the default loader; use `images: { unoptimized: true }` or plain `<img>`
   The full list is in `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`. If a feature seems to need a server, stop and ask; don't work around it.
2. **Household data never leaves the device.** No backend, database service, analytics, telemetry or third-party API receives profile, plan or checklist data. Persist state in IndexedDB on the client, with a single typed storage module. Do not use `localStorage` for app data.
3. **Works online and offline, the same way.** People normally use the app online. It must keep working with no connection, for example during a blackout. The profile, plan, action list and ticking behave the same in both cases, so never make a core feature depend on the network. Ship plan content and quantity rules as bundled static data, not as runtime fetches. The service worker (Serwist) precaches the app shell and every route after the first online visit. When the device is online, the service worker picks up new app versions in the background. When it's offline, the cached version keeps running and shows no error screens.
4. **No accounts, auth, payments or sync** in v1 (see PRD Non-Goals).

## Build and offline setup

- `npm run build` runs `next build` (static export to `out/`), then `scripts/build-sw.mjs`, which bundles `src/sw.ts` into `out/sw.js` and precaches every exported file. `npm start` serves `out/` locally. The service worker only registers in production builds, not in `next dev`.
- `out/offline.html` is the fallback for pages that aren't saved on the device. Keep its text in Polish.
- Leave `cacheComponents` off in `next.config.ts`. It rejects the `force-static` route config that static export requires.

## Code conventions

- TypeScript strict; no `any`. Validate anything read back from IndexedDB at the boundary (e.g. with Zod).
- Components that touch `window`, `navigator` or IndexedDB are Client Components (`'use client'`) and access those APIs only inside effects or event handlers, because pages are prerendered at build time.
- Business logic (quantities = per-person-per-day × people × days, priority tiers) lives in pure, unit-testable functions outside components.
- Every recommended quantity carries a source label: "Official guidance" or "PREPWISE recommendation". Never present an estimate as official.
- All user-facing text is in Polish (`<html lang="pl">`). Avoid jargon or explain it. Keep layouts readable at large system font sizes and usable with a screen reader.
