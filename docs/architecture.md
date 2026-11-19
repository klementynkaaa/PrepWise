# Architecture

## Overview

PREPWISE is an installable web app (PWA). It is built with Next.js and shipped as a **static export**: plain HTML, CSS and JS with no server of our own at runtime. A service worker saves the whole app on the device after the first online visit. From then on it works the same with or without a connection.

Household data lives on the device. For household sharing, the browser may sync it with two hosted services in the EU: Supabase (database, sign-in, access rules) and PowerSync (sync). **Production keeps sync off** until legal advice and a DPIA are done, so in production nothing leaves the device yet.

```
browser ── first visit (online) ──▶ static host (Vercel)
   │                                   └─ HTML/CSS/JS + sw.js
   ├─ service worker: precaches every file, serves them offline
   ├─ local database (PowerSync, on the device): household profile, plan state, ticked items
   └─ sync, only when configured (off in production) ──▶ PowerSync Cloud (EU) ──▶ Supabase (Frankfurt)
```

## Stack

| Area      | Choice                                                                                                                                                                         |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework | Next.js 16 (App Router), React 19, TypeScript (strict)                                                                                                                         |
| Styling   | Tailwind CSS 4 with the PREPWISE design system tokens; Plus Jakarta Sans, self-hosted                                                                                          |
| Text      | next-intl with one Polish dictionary, `messages/pl.json`                                                                                                                       |
| Offline   | Serwist service worker, built after the static export                                                                                                                          |
| Storage   | PowerSync's local SQLite database on the device, behind one typed storage interface (`src/lib/household`); an S-01 household in IndexedDB is imported once                     |
| Backend   | Supabase in Frankfurt (Postgres, anonymous and email-code sign-in, row-level security) and PowerSync Cloud in the EU; schema in `supabase/migrations/`; sync off in production |
| Hosting   | Vercel (static files)                                                                                                                                                          |
| CI/CD     | GitHub Actions (`.github/workflows/ci.yml`): every quality gate on every PR; `develop` → Vercel preview, `main` → staged production, smoke check, approval, promote, tag       |

## Key decisions

- **PWA instead of native apps.** One codebase, installable from the browser, and no app store review.
- **Static export, hosted services, Edge Functions.** The Next.js app has no server of its own. Server-only Next.js features are off-limits: Server Actions, request-based Route Handlers, cookies or headers, proxy/middleware, ISR, and the default image optimizer. See `AGENTS.md` for the full list. Client Components may call the approved hosted services (Supabase and PowerSync) with public `NEXT_PUBLIC_*` values only; no secret goes into the bundle. The only server code we write is Supabase Edge Functions in `supabase/functions/`, for work that needs a secret, such as deleting an account.
- **Shared backend, switched off in production.** Household members share one household through Supabase in Frankfurt and PowerSync Cloud in the EU. The app syncs only when all its sync variables (`NEXT_PUBLIC_*`) are set. They are set for preview deployments only; production has none, so production does not sync until legal advice and a DPIA are done. Decisions and reasons: [`docs/decisions/household-sharing.md`](decisions/household-sharing.md).
- **Next.js over a lighter client-only option.** Chosen for popularity and tooling. The trade-off: agents tend to reach for server features by default, so the restrictions are written into `AGENTS.md`.
- **Content ships with the app.** Plan content and quantity rules are bundled as static data and never fetched at runtime, so they are available during a blackout.
- **`cacheComponents` is disabled.** It conflicts with the `force-static` route config that static export requires.

## Routes and text

- **Locale routes.** Every screen lives under `/pl/...` (`src/app/[locale]/`), so adding a language later moves no URL. Links are built only with the locale helper (`localePath` in `src/i18n/paths.ts`), never typed by hand.
- **Two root layouts.** `src/app/(root)/` holds `/` and `/offline`, which sit outside the locale; `src/app/[locale]/` holds everything else. `/` is a static page that forwards to `/pl` (a server redirect is not possible in a static export): a meta refresh, a client-side replace and a visible link as the last fallback.
- **App screens.** After the household profile (`/pl/start/...`, overview at `/pl/household`) come the app screens with the Start · Plan · Lista tab bar: Start (`/pl/home`), the hub a returning household lands on, the plan (`/pl/plan`) and the shopping list (`/pl/list`).
- **Where the app opens.** `/pl` resumes a saved household on the client (a static export has no server to redirect): an unfinished profile continues at its first unfinished step, a complete profile opens the overview until this device has created a plan, and then Start. With nothing saved, Welcome shows.
- **One dictionary.** All user-facing text lives in `messages/pl.json`, not in components, routes or features. Screens read it through next-intl, so a second language is a second file.

## Household data

- **Storage interface.** Screens reach the household profile only through the `HouseholdStore` interface in `src/lib/household`. The implementation is PowerSync's local database on the device (`powersync-store.ts`, stored in the browser's origin private file system), with no server connection; an in-memory one serves tests. While sync is off, it writes local-only twins of the synced tables, so nothing waits for upload. `subscribe` tells the screens about every change. Data read back is validated at the boundary. Where the database can't open (a private Safari window), screens show the existing "storage unavailable" states.
- **Ticks.** Each ticked item on the shopping list is one row of the synced `household_ticks` set table (id `<household_id>:<item id>`), holding `selected` and the quantity it was ticked at. A tick row that can't be read is skipped, never making the profile unreadable.
- **Shared household.** Each person belongs to one household, shared by its members on all their devices, with an `owner` and `member`s. Accounts are anonymous by default, with optional email-code linking. The Supabase backend enforces membership with row-level security and merges concurrent edits per field by timestamp. The screens and the sync client come in a later change (S-10); until then nothing syncs.

### Data contract

Every piece of household data that may be shared follows these rules, so later features (S-02 to S-07) store their data in the shared format from the start. The row shapes and the code that maps them live in `src/lib/household` (`rows.ts`, `contract.ts`).

- **Ids.** The device makes a UUID for every new household and entity. A set element (a need, a confirmed step, later a ticked item) gets a fixed id, `<household_id>:<element>`, so two devices adding the same element write the same row.
- **One row per set element.** A set is never an array column. Each element is its own row with a `selected` flag; removing it sets `selected: false`, so it can be added again later.
- **Entity rows** (for example an inventory item) have a `deleted_at` column. Deletion sets it, and **delete wins**: later edits to a deleted row are ignored. Nothing is ever hard-deleted by the app. A household is never soft-deleted; when its last member leaves, it is erased with all its rows.
- **Shared columns.** Every synced row has `household_id`, `updated_at` and `field_ts`, which records when each column last changed. The server fills `created_by` and `updated_by`; the device never sends who it is.
- **Flat fields, patch saves.** Columns are plain values in `snake_case`, matching Postgres one to one, never nested objects. A save writes only the columns that changed, with a `field_ts` entry for each, so edits from two devices merge column by column (latest timestamp wins). Fields are only ever added, never renamed or removed.
- **One source for shapes.** Row shapes are Zod schemas in `rows.ts`. A change that adds or alters a table adds the matching migration in `supabase/migrations/` in the same change.
- **Device-only state** (which household this device shows, when this device created its plan (`plan_created_at`) and its shopping list (`list_created_at`), filters, hints) lives in the local-only `device_state` table and other local-only tables that never sync.
- **Bundled item ids** (plan items, emergencies) are kebab-case slugs written by hand. They never change and are never reused, because stored rows refer to them.
- **Rules that span fields are applied on read.** A merge can combine two valid edits into an odd mix (say, "no pets" with a cat count). Turning rows into the household that screens use (`assemble`) normalises this: without pets, pet counts read as 0. The profile status is computed there too, never stored.

## Plan

- **Derived, not stored.** `src/lib/plan` holds the bundled plan content (typed items with permanent slugs, amounts per member group or pet kind, a source label and a verified flag) and a pure `buildPlan`, which turns the profile summary and the number of days into tiers, categories and member sections. Screens build the plan from the stored profile every time they open, so profile edits flow in without a new "generate". The only stored value is the device-only "plan created" timestamp, which decides where the app opens. All plan words live in `messages/pl.json`; `src/lib/plan` holds no Polish.
- **The shopping list is derived too.** `src/lib/list` has a pure `buildList`, which turns the plan and the stored ticks into groups by priority (pets last), the "Najpierw" item and the progress count. The list, Plan's list panel and Start all take their count from it. Only the ticks and the device-only "list created" timestamp are stored; a tick on any device also counts as the list existing.

## Offline behaviour

- **Precache:** `scripts/build-sw.mjs` runs after `next build`. It saves every file in `out/` (pages, route payloads, assets, icons) and bundles `src/sw.ts` into `out/sw.js`. Of PowerSync's files, which `npm run assets` copies into `public/@powersync/` before every build, it saves only the worker, the SQLite build and the WASM that the chosen storage (`OPFSCoopSyncVFS`) loads.
- **Pages:** they are served from the cache first. This includes Next.js in-app navigation requests (the `_rsc` parameter is ignored when matching).
- **Updates:** while online, a new deployment's service worker installs in the background and takes over immediately.
- **Fallback:** any page not saved on the device shows a Polish offline page (`/offline`).
- **First visit:** the app needs one online visit before it can work offline.

## Design system

- **Tokens** live in `src/app/globals.css` (`@theme`). Tailwind's default colours, text sizes, radii, shadows and fonts are removed, so only system values exist. The source of truth is the PREPWISE Design System; a missing value is added there first.
- **Components** live in `src/components/ui/`, one folder per component with its story and test (`ui/<Name>/`); shared helpers are in `ui/_shared/`. Import from `@/components/ui` only. Most render on the server with no client JS; only interactive ones (stepper, choices, checklist, tab bar, sheet, undo) are Client Components.
- **Storybook** is the component showcase: every component and state has a story (`npm run storybook`). `npm run test:storybook` renders every story in Chromium and fails on accessibility violations; CI runs it. Storybook is a dev tool and is not part of the exported app.
- **Light theme only.** Every screen is one phone-width column, capped at 32rem and centred.
- **App shell:** screens after Welcome have a header (`AppHeader`) and a sticky bottom tab bar (`TabBar`) that stays at the bottom of the window. Welcome has neither.
- **Logo and app icon:** the `Logo` component draws the mark and name. The icon set is generated from `design/icons` with `npm run icons` into `public/icons` (browser tab, Apple touch, manifest and maskable icons). The layout metadata points at the SVG and PNG icons; a small `public/favicon.ico` (generated by the same script) only answers clients that ask for `/favicon.ico` directly.
- **Narrow widths:** plan, progress and checklist rows and the banner stack by their own width (container queries), not by screen width.
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
npm test           # unit, integration and component tests, then the store tests (Vitest)
npm run test:coverage  # unit, integration and component tests, with the coverage floor
npm run test:store # store tests on PowerSync's real local database, in Chromium
npm run test:e2e   # browser tests (Playwright); needs a prior npm run build
npm run storybook       # component showcase on http://localhost:6006
npm run test:storybook  # every story in Chromium, with accessibility checks
npm run db:start   # local Supabase in Docker (also db:stop, db:reset)
npm run db:test    # database tests (pgTAP) against local Supabase
```

## Deployment

GitHub Actions deploys with the Vercel CLI, and never rebuilds the app for a deployment. The tested `out/` (the artifact the browser tests ran against) is turned into `.vercel/output` by `scripts/vercel-output.mjs`, then shipped with `vercel pull` → `vercel deploy --prebuilt`. `vercel.json` makes Vercel serve the files as plain static files, with clean URLs and no caching for `sw.js`; the same rules are carried into the generated output. It also turns off Vercel's own Git deployments, so each merge deploys exactly once. `404.html` stays reachable (it is not redirected), because the service worker precaches it.

- **`develop`:** a Vercel preview deployment.
- **`main`:** a staged production deployment (`--prod --skip-domain`, not on the production domain), then smoke and health checks against it, then the owner's approval in the `production` GitHub environment, then a promote through the Vercel REST API (`scripts/vercel-promote.mjs`; the CLI's `vercel promote` fails for this token), which assigns the production domain without rebuilding. A health check on the production domain and a release tag follow. See `docs/development-process.md`.
- **`version.json`:** every build writes `out/version.json` with the commit SHA. The health check compares it with the commit being released, which proves which version a URL serves. It is not precached, so it is always read from the network.

## Localisation and accessibility

The UI is in Polish (`<html lang="pl">`), with the text kept in `messages/pl.json`. Fonts are self-hosted with Polish characters. Layouts must work with a screen reader.
