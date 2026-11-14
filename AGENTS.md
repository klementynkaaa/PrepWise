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

## Git workflow (always)

- Never commit to `main` or `develop` directly. Each change gets its own branch off `develop`: `feature/…`, `bugfix/…`, `refactor/…`, `chore/…` or `docs/…`, in kebab-case. The exception is `hotfix/…`, which branches off `main` and goes into `main`.
- For a roadmap item, name the branch `<type>/<change-id>` (the change ID from the roadmap) so its GitHub issue moves to in progress and closes on merge. After editing `context/foundation/roadmap.md`, the issues sync by hook; otherwise run `npm run roadmap:sync`. See `docs/development-process.md`.
- Work branches go into `develop` through a squash-merged pull request. `develop` goes to `main` through a release pull request (title `chore(release): …`), merged with a merge commit. The `develop protection` and `main protection` rulesets block direct pushes and wrong source branches.
- After every release or hotfix, open a sync PR from `main` into `develop` and merge it with a **merge commit**, never squash. Otherwise the next release PR shows as behind `main`. See `docs/development-process.md`.
- Commit messages and PR titles follow Conventional Commits. The `PR conventions` check enforces the PR title, the branch name and the allowed source branch. Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`, `build`, `revert`.
- Don't start feature work until the foundation is done: CI/CD, then reviewed mockups, then the design system. UI uses only design-system tokens and components. Details: `docs/development-process.md`.

## Before opening a PR

- Run `npm run format:check`, `npm run lint`, `npm run typecheck` and `npm test`. After `npm run build`, also run `npm run test:e2e`. After changing a component, run `npm run test:storybook`. CI runs the same gates, plus a dependency audit and a secret scan (see `docs/development-process.md`).
- Add every new route to `e2e/routes.ts`, so the offline and accessibility tests cover it.
- Put new business logic in `src/lib/` with unit tests. Coverage there must stay at or above the 80% floor.

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

## Design system (UI rules)

- Build screens only from `@/components/ui` and the token utilities in `src/app/globals.css`. No raw hex colours and no arbitrary Tailwind values (`[…]`).
- A missing value or component is added to the PREPWISE Design System first, then to `globals.css` / `src/components/ui/`. Don't add one-off styles in a screen.
- Every new component gets a Storybook story covering all its states (`src/components/ui/*.stories.tsx`); `npm run test:storybook` must pass (it fails on axe violations). Interactive components also get a Testing Library test (`npm run test:components`).
- Empty, success, offline and error states always use `EmptyState`, which has one look: only the illustration, the words and an optional button change.

## UI changes: mockup, component, Storybook (every change that touches UI)

The agreed mockups (`context/foundation/mockups.md`, if present) are direction, not contract. They show the look and structure; the details are decided per change, while building it. For each change that adds or alters UI:

1. **Mockup first, in detail.** Run `/10x-mockup <change-id>` (change mode, before `/10x-plan`) for every screen and state the change adds or alters, including empty, loading, error, offline and large-text states. If the change adds a new component or a new variant, draw it with all its states in the mockup and in the Design System before any code. If a drawn artboard turns out wrong during the build, change it and say so in the change notes.
2. **Design System, then code.** A new token, component, variant or illustration goes into the PREPWISE Design System first, then into `globals.css`, `src/components/ui/` and (for illustrations) `public/illustrations/` plus the names in `Illustration.tsx`. Never a one-off style in a screen.
3. **Storybook documents it.** Each new or changed component gets a `*.stories.tsx` with a story per state (default, pressed/focus, disabled, error, long text, large text where it applies), `tags: ["autodocs"]`, and a short Polish description of when to use it and when not. Interactive components also get a Testing Library test. `npm run test:storybook` must pass (axe violations fail it).
4. **Illustrations follow the Design System rules:** decorative (`alt=""`, `aria-hidden`), never on list rows, state scenes only via `EmptyState`, banners with a short title and one sentence, only the approved colours. A new scene or item is drawn in the same flat style and added to the Design System Illustrations group first.
5. **Docs stay in sync.** Add each new route to `e2e/routes.ts`; if the change alters a rule or the architecture, update the matching file in `docs/`. If the Design System README or `mockups.md` placement list changes, update it in the same change.

Done means: the mockup is agreed or its deviation noted, the component is in the Design System, every state has a story, and `format:check`, `lint`, `typecheck`, `test`, `test:storybook` pass.
