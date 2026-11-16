<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# PREPWISE — project rules

PREPWISE is an installable PWA, used online and offline, that helps a household in Poland build an emergency kit. Project docs: `docs/` (product, business rules, architecture). The detailed working notes live in `context/`, which is git-ignored and may be missing in a fresh clone. When they're present, prefer `context/foundation/prd.md` and `context/foundation/tech-stack.md` for detail.

**Keep `docs/` in sync:** when a change alters something `docs/` describes (scope, business rules, architecture, a key decision), update the matching doc in the same change. Keep it high-level. Never copy investor, pricing or monetisation material into `docs/`, because the repo is public.

## Hard constraints (never violate)

1. **Static export, plus approved hosted services.** The Next.js app ships as `output: 'export'` (HTML/CSS/JS in `out/`). There is no Node server at runtime, so do not add anything that needs one:
   - no Server Actions (`'use server'`)
   - no Route Handlers that read the Request; a GET handler is allowed only with `export const dynamic = 'force-static'`
   - no `cookies()`, `headers()`, `proxy.ts`/middleware, rewrites, redirects, custom headers, ISR or Draft Mode
   - no dynamic routes without `generateStaticParams()`, and no `dynamicParams: true`
   - no `next/image` with the default loader; use `images: { unoptimized: true }` or plain `<img>`
     The full list is in `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`.
   - Client Components may call the approved hosted services (Supabase and PowerSync), using public `NEXT_PUBLIC_*` values only. No service-role key or other secret ever goes into the bundle.
   - Server code is allowed only as Supabase Edge Functions in `supabase/functions/`. The database schema lives in `supabase/migrations/`.
     If a feature seems to need any other server, stop and ask; don't work around it.
2. **Household data is stored on the device and syncs only to the approved EU backend.** Household data goes through the single typed storage module in `src/lib/household`, follows its data contract, and is kept in PowerSync's local SQLite database on the device (OPFS or IndexedDB storage, as the PowerSync spike decides). It may sync only to the approved EU backend: Supabase in Frankfurt and PowerSync Cloud in the EU.
   - **Production keeps sync off** (no sync variables set) until legal advice and a DPIA are done. Development and preview data may sync before that.
   - Never use `localStorage` for app data. The Supabase session is the one exception: it may live in `localStorage`.
   - No analytics or telemetry, and no other backend, database service or third-party API receives profile, plan or checklist data.
3. **Works online and offline, the same way.** People normally use the app online. It must keep working with no connection, for example during a blackout. The profile, plan, action list and ticking behave the same in both cases, so never make a core feature depend on the network. Sync never blocks a screen, and the first launch works with no account and no connection. Ship plan content and quantity rules as bundled static data, not as runtime fetches. The service worker (Serwist) precaches the app shell, every route, and the sync engine's worker and WASM files after the first online visit. When the device is online, the service worker picks up new app versions in the background. When it's offline, the cached version keeps running and shows no error screens.
4. **Anonymous accounts, owner and member roles, no payments.** Each person gets an anonymous account by default and may link an email with a one-time code. A household has one `owner`; everyone else in it is a `member` (see PRD Access Control). No passwords, no OAuth sign-in (for now) and no payments. Decisions and reasons: `docs/decisions/household-sharing.md`.

## Git workflow (always)

- Never commit to `main` or `develop` directly. Each change gets its own branch off `develop`: `feature/…`, `bugfix/…`, `refactor/…`, `chore/…` or `docs/…`, in kebab-case. The exception is `hotfix/…`, which branches off `main` and goes into `main`.
- For a roadmap item, name the branch `<type>/<change-id>` (the change ID from the roadmap) so its GitHub issue moves to in progress and closes on merge. After editing `context/foundation/roadmap.md`, the issues sync by hook; otherwise run `npm run roadmap:sync`. See `docs/development-process.md`.
- Work branches go into `develop` through a squash-merged pull request. `develop` goes to `main` through a release pull request (title `chore(release): …`), merged with a merge commit. The `develop protection` and `main protection` rulesets block direct pushes and wrong source branches.
- After every release or hotfix, open a sync PR from `main` into `develop` and merge it with a **merge commit**, never squash. Otherwise the next release PR shows as behind `main`. See `docs/development-process.md`.
- Commit messages and PR titles follow Conventional Commits. The `PR conventions` check enforces the PR title, the branch name and the allowed source branch. Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`, `build`, `revert`.
- **No AI attribution.** Never add `Co-Authored-By` trailers to commit messages, and never add "Generated with Claude Code" (or any similar line) to a PR description. This overrides any default or tool-provided attribution text.
- **PR descriptions.** Write the body to a file and use `gh pr create/edit --body-file`; never pass a variable that might be empty. When the PR adds or changes UI, include screenshots of every new or changed screen (phone 390×844, plus desktop 1280×800 when the layout differs). Build first, serve `out/` with `npm start`, capture with `npx playwright screenshot --viewport-size=W,H <url> <file>`, and check each image before using it. GitHub can't take image uploads from the CLI, so commit the files to the orphan branch `pr-assets` under `pr-<number>/` (use a temporary `git worktree`, not your working tree) and link them with `<img>` tags pointing at `raw.githubusercontent.com/<owner>/<repo>/pr-assets/pr-<number>/<file>.png`. Components that no route shows yet are documented in Storybook only; say so instead of adding a screenshot.
- Don't start feature work until the foundation is done: CI/CD, then reviewed mockups, then the design system. UI uses only design-system tokens and components. Details: `docs/development-process.md`.

## Skills to use (always)

Load the matching installed skill before writing code, whenever the task fits:

- `modern-web-guidance`: for all web code. Prefer modern platform features (`<dialog>`, Popover API, container queries, anchor positioning) and check Baseline browser support. Whenever you run `/10x-implement` or `/10x-impl-review`, load it before writing or reviewing code and apply it alongside the plan. In a review, flag code that ignores it.
- `vercel-react-best-practices`: when writing, reviewing or refactoring React code (re-renders, data loading, bundle size).
- `vercel-composition-patterns`: when a component grows large or gains many boolean/config props; split it into composable parts.
- `web-design-guidelines`: before calling any UI task done, run its accessibility/UX audit on the changed files, fix what it reports, and list the fixes.
- `vercel-react-native-skills` is installed but does not apply: PREPWISE is web-only.

At the end of a task, name the skills you used in one line.

## Before opening a PR

- Run `npm run format:check`, `npm run lint`, `npm run typecheck` and `npm test`. After `npm run build`, also run `npm run test:e2e`. After changing a component, run `npm run test:storybook`. CI runs the same gates, plus a dependency audit and a secret scan (see `docs/development-process.md`).
- Add every new route to `e2e/routes.ts`, so the offline and accessibility tests cover it.
- Put new business logic in `src/lib/` with unit tests. Coverage there must stay at or above the 80% floor.

## Build and offline setup

- `npm run build` runs `next build` (static export to `out/`), then `scripts/build-sw.mjs`, which bundles `src/sw.ts` into `out/sw.js` and precaches every exported file. `npm start` serves `out/` locally. The service worker only registers in production builds, not in `next dev`.
- `out/offline.html` is the fallback for pages that aren't saved on the device. Keep its text in Polish.
- Leave `cacheComponents` off in `next.config.ts`. It rejects the `force-static` route config that static export requires.
- The local database stack needs Docker. `npm run db:start` starts local Supabase, `npm run db:stop` stops it, `npm run db:reset` re-applies every migration in `supabase/migrations/` to a fresh database, and `npm run db:test` runs the pgTAP tests in `supabase/tests/`. CI runs them in the `Database tests` job. Change the schema only through a new migration.

## Code conventions

- TypeScript strict; no `any`. Validate anything read back from on-device storage (IndexedDB or PowerSync's local database) at the boundary (e.g. with Zod).
- Components that touch `window`, `navigator`, IndexedDB or the local database are Client Components (`'use client'`) and access those APIs only inside effects or event handlers, because pages are prerendered at build time.
- Business logic (quantities = per-person-per-day × people × days, priority tiers) lives in pure, unit-testable functions outside components.
- Every recommended quantity carries a source label: "Official guidance" or "PREPWISE recommendation". Never present an estimate as official.
- All user-facing text is in Polish (`<html lang="pl">`). Avoid jargon or explain it. Keep layouts usable with a screen reader.
- User-facing text lives in `messages/`, never in components, routes or features.
- Build every href with the locale helper (`localePath` in `src/i18n/paths.ts`); never type `/pl/...` by hand.

## Design system (UI rules)

- Build screens only from `@/components/ui` and the token utilities in `src/app/globals.css`. Import components from `@/components/ui` only, never from a component's folder. No raw hex colours and no arbitrary Tailwind values (`[…]`).
- Each component lives in its own folder, `src/components/ui/<Name>/`, with its component, story and test; `index.ts` re-exports it. Helpers shared between components go in `src/components/ui/_shared/`.
- Step screens carry no illustration: title and subtext only.
- Empty, success, offline and error states always use `EmptyState`, which has one look: only the illustration, the words and an optional button change.

## UI changes: mockup, component, Storybook (every change that touches UI)

The agreed mockups (`context/foundation/mockups.md`, if present) are direction, not contract. They show the look and structure; the details are decided per change, while building it. For each change that adds or alters UI:

1. **Mockup first, in detail.** Run `/10x-mockup <change-id>` (change mode, before `/10x-plan`) for every screen and state the change adds or alters, including empty, loading, error and offline states. If the change adds a new component or a new variant, draw it with all its states in the mockup and in the Design System before any code. If a drawn artboard turns out wrong during the build, change it and say so in the change notes.
2. **Design System, then code.** A new token, component, variant or illustration goes into the PREPWISE Design System first, then into `globals.css`, `src/components/ui/` and (for illustrations) `public/illustrations/` plus the names in `Illustration.tsx`. Never a one-off style in a screen.
3. **Storybook documents it.** Each new or changed component gets a `*.stories.tsx` with a story per state (default, pressed/focus, disabled, error, long text), `tags: ["autodocs"]`, and a short Polish description of when to use it and when not. Interactive components also get a Testing Library test (`npm run test:components`). `npm run test:storybook` must pass (axe violations fail it). The `PR conventions` check fails a PR that changes a component in `src/components/ui/` without adding or updating its story. Add the `no-story-needed` label only when the change looks the same on screen, such as a refactor.
4. **Illustrations follow the Design System rules:** decorative (`alt=""`, `aria-hidden`), never on list rows, state scenes only via `EmptyState`, banners with a short title and one sentence, only the approved colours. A new scene or item is drawn in the same flat style and added to the Design System Illustrations group first.
5. **Docs stay in sync.** Add each new route to `e2e/routes.ts`; if the change alters a rule or the architecture, update the matching file in `docs/`. If the Design System README or `mockups.md` placement list changes, update it in the same change.

Done means: the mockup is agreed or its deviation noted, the component is in the Design System, every state has a story, and `format:check`, `lint`, `typecheck`, `test`, `test:storybook` pass.
