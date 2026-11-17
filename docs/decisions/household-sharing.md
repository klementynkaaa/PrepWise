# Household sharing decisions

Household members will share one household across their own devices. This page records the decisions behind that, so later changes cite them instead of deciding again. Each entry gives the date, the choice, the reason and the source.

Two changes deliver it:

- **S-09 `household-sharing`** (infrastructure): the rules, the shared data format, the local store on PowerSync, and the Supabase backend proven by database tests. Nothing syncs.
- **S-10 `household-sharing-ui`**: the screens, the sign-in and sync client, the account-deletion Edge Function and the hosted development environment.

**Production keeps sync off** until legal advice and a data protection impact assessment (DPIA) are done (see [Production switch and legal gate](#production-switch-and-legal-gate)).

Sources: "owner" is a decision by the project owner; "research" and "plan" are the S-09 working notes (`context/changes/household-sharing/research.md` and `plan.md`), which are kept outside the public repository.

## Scope

- **Date:** 2026-11-16
- **Choice:** S-09 builds the infrastructure and brings what S-01 built up to it. The sign-in and sync client, the hosted development environment and every screen go to S-10.
- **Reason:** later slices (S-02 to S-07) need the shared data format now; the sync client is best designed against real screens.
- **Source:** owner, during planning (split of the plan).

## Accounts: anonymous first, email linking

- **Date:** 2026-11-16
- **Choice:** the app signs in anonymously on first launch, with no sign-up step. A person may link an email address with a 6-digit one-time code, which keeps the same account. No passwords, no Google or Apple sign-in for now.
- **Reason:** the app works with no sign-up step, and an email code needs no redirect, so it works in an app installed on iOS (OAuth redirects may end up in Safari instead of the installed app).
- **Source:** owner, after research.

## One household per person

- **Date:** 2026-11-16
- **Choice:** a person belongs to one household at a time, shared by all its members on all their devices. Joining another household replaces their own, and only when the join carries an explicit `replace_existing` flag, which S-10 sends after the app has explained what happens and the person has confirmed. Their own household is deleted if they were alone in it; otherwise they just leave it. There is no list of households and no switching between them.
- **Reason:** this is the owner's model, and nobody loses a household by accident.
- **Source:** owner, correction during planning (an earlier proposal allowed several households per person).

## Signing in on another device

- **Date:** 2026-11-16
- **Choice:** signing in with a linked email on another device shows the account's household. A household made on that device before signing in is discarded, unless the account has none; then it becomes the account's household. Signing in needs a connection and first sends the device's waiting changes.
- **Reason:** signing in always shows "my" household.
- **Source:** owner, during planning.

## Roles: owner and member

- **Date:** 2026-11-16
- **Choice:** a household has exactly one `owner`; everyone else is a `member`. Members read and edit all household data. Any member may invite. Only the owner removes members, and never themselves. When the owner leaves, the member who joined earliest becomes the owner. When the last member leaves, the household and all its data are deleted. A removed member's device loses the household. There are no co-owners.
- **Reason:** a household is never left without an owner, and the rules stay simple.
- **Source:** owner, after research.

## Invites

- **Date:** 2026-11-16
- **Choice:**
  - An invite comes as a QR code, a link and a code. The code has 8 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (no look-alike characters), shown as `XXXX-XXXX`.
  - The link is `/pl/join#CODE`, built with the locale helper. The code sits in the URL fragment, not in the path or the query.
  - An invite is valid for 48 hours, works once and can be revoked by its creator or the owner. A member using it again does not use it up.
  - Only a hash of the code is stored. Checking or redeeming a code is capped at 10 failed attempts per person per hour.
- **Reason:** a static export can't have a route per invite token. The service worker ignores the fragment, so the join page opens offline from the precache, and browsers never send the fragment to the server, so the code stays out of logs. The hash and the attempt cap protect against guessing.
- **Source:** owner, after research (link form chosen 2026-11-16).

## Backend: Supabase in Frankfurt plus PowerSync in the EU

- **Date:** 2026-11-16
- **Choice:** Supabase in Frankfurt for the database, sign-in, row-level security and database functions; PowerSync Cloud in the EU for offline sync. Server code is allowed only as Supabase Edge Functions; the Next.js app stays a static export.
- **Reason:** PowerSync was the only checked option with a durable ordered change queue, uploads through our own database functions, wiping a removed member's device, and a sync status, all with no server of our own. Supabase keeps sign-in and data in the EU and publishes a data processing agreement. Options ruled out: Dexie Cloud (hosted data in the US), Firestore (sign-in runs in the US), Jazz and ElectricSQL (both need our own backend). RxDB is the fallback if the PowerSync spike fails.
- **Source:** owner, after research.

## Conflicts: per-field timestamps, delete wins

- **Date:** 2026-11-16
- **Choice:** concurrent edits merge per field: the edit with the later timestamp wins. Each row carries a timestamp per field, and the merge runs in Postgres, which caps any timestamp at the server's current time. For rows that can be deleted, delete wins: once a row is marked deleted, later edits don't bring it back.
- **Reason:** this is the owner's rule. PowerSync's default orders edits by arrival at the server, not by when they were made, so the merge has to live in the database.
- **Source:** owner, after research.

## Set rows use a `selected` flag

- **Date:** 2026-11-16
- **Choice:** values that are toggled on and off (a need, a completed step, later a ticked item) are stored as one row per value with a fixed id (`<household_id>:<value>`) and a `selected` flag, merged by timestamp like any other field. They are never marked deleted.
- **Reason:** with "delete wins", a removed need could never be added back.
- **Source:** plan.

## Session in `localStorage`

- **Date:** 2026-11-16
- **Choice:** the Supabase session stays in `localStorage`, the supabase-js default. App data never goes into `localStorage`; it lives in PowerSync's local database.
- **Reason:** the owner allowed it, and it keeps the client on its default, documented setup.
- **Source:** owner, after research.

## Production switch and legal gate

- **Date:** 2026-11-16
- **Choice:** the app syncs only when all its sync variables (`NEXT_PUBLIC_*`) are set. Preview deployments get them; production does not. Production stays without accounts and sync until legal advice and a DPIA are done. Development and test data may sync before that.
- **Reason:** the profile includes health-related needs (for example, someone takes regular medicines), which are likely special-category data under the GDPR. Real users wait for the legal review.
- **Source:** owner, after research; the switch itself is from the plan.

## Hosting: local first

- **Date:** 2026-11-16
- **Choice:** in S-09 the backend runs only as local Supabase in Docker, on developer machines and in CI. The hosted development projects in the EU come with S-10.
- **Reason:** nothing calls a hosted backend until S-10.
- **Source:** owner (split of the plan).

## PowerSync spike

- **Date:** 2026-11-16
- **Choice:** a short spike answers four open checks before the local store is rebuilt: whether the app can write to synced tables before the first sign-in; whether rows arrive without a gap after a household created offline uploads, and which signal tells that a membership was removed; whether the worker and WASM files can be precached and work in an app installed on iOS, and how much they add; and the hosted service's rule for idle instances.
- **Reason:** the first check decides the store design, and the third can stop the plan.
- **Source:** plan.

## Store branch

- **Date:** 2026-11-16
- **Choice:**
  - While sync is off, the store writes the household to PowerSync **local-only** tables: twins of `households`, `household_needs` and `household_steps` that never queue an upload. The device's `household_id` is in a local-only table too.
  - The synced tables stay empty until S-10. After the first successful sign-in, S-10 copies the twins into the synced tables in one transaction and empties the twins.
- **Reason:**
  - The spike showed that writes to synced tables before any sign-in do work: they wait in the upload queue and upload after sign-in.
  - But every save adds to that queue. A production build with sync off would keep a queue growing from install day, and it would all upload when sync is turned on.
  - Local-only tables keep the queue empty and reuse the copy step S-10 needs anyway. The copy was tested: one upload per row.
- **Source:** spike (check 1), plan.

## Storage (VFS)

- **Date:** 2026-11-16
- **Choice:** PowerSync's SQLite database uses `OPFSCoopSyncVFS` (the browser's origin private file system), set explicitly. `'auto'` is not used, because it silently falls back to an in-memory database when that file system is missing.
- **Reason:** it is PowerSync's advice for apps with Safari and iOS users. In the spike it opened in about 0.1 s, and a saved household survived a restart offline, in Chromium and in WebKit. A private Safari window has no such file system (the database fails to open there), so the store needs a visible fallback for that case.
- **Source:** spike (check 3, including an installed app on iOS 26), PowerSync documentation.

## Precache approach

- **Date:** 2026-11-16
- **Choice:**
  - Before every build, PowerSync's `copy-assets` command copies its worker and WASM files into `public/@powersync/`. These copies are not committed, and the app loads the worker from that path.
  - The service worker build precaches `wasm` files too, but only the files the chosen storage loads.
  - It excludes PowerSync's other builds and the duplicate worker and WASM files that the Next.js bundler emits.
  - The file size limit stays as it is, because the largest file is about 1 MiB.
- **Reason:** offline start must not need the network. Precaching every copied and bundled build would make the precache roughly ten times larger, and a missing file breaks the offline start with an error.
- **Source:** spike (check 3).

## CAPTCHA slot

- **Date:** 2026-11-16
- **Choice:** anonymous sign-in accepts an optional CAPTCHA token from the start. The provider (Turnstile or hCaptcha) is chosen in S-10, before production.
- **Reason:** Supabase strongly recommends a CAPTCHA for anonymous sign-in, but choosing a provider adds a processor, which is not needed while nothing syncs.
- **Source:** plan.

## Account deletion

- **Date:** 2026-11-16
- **Choice:** a database trigger runs the leave rules (owner handover, or deleting a household left empty) whenever an account is deleted. The `delete-account` Supabase Edge Function, which deletes the account itself, comes with S-10.
- **Reason:** deleting an account needs a secret key that can't go into the browser, so it must run as server code; the ownership rules are proven in the database now, and the function needs the client.
- **Source:** owner (split of the plan).

## Sync tests

- **Date:** 2026-11-16
- **Choice:** in S-09, database tests (pgTAP) and unit tests run in CI. The two-device sync test (`test:sync`) comes with the sync client in S-10 and runs on developer machines.
- **Reason:** CI stays fast and stable, and the merge and access rules are proven where they live.
- **Source:** plan.

## "Delete all" left open

- **Date:** 2026-11-16
- **Choice:** what "Delete all" means for a shared household (this device only, or the whole household for everyone) is not decided. The store's `clear()` stays device-only and no screen uses it.
- **Reason:** its shared meaning is a product decision for S-10.
- **Source:** owner, during planning.

## Questions for a lawyer

To be answered before production syncs (from the research on the GDPR basis for the "needs" flags; fact-finding, not legal advice):

1. Are household-level flags health data in small households?
2. Which Art. 9(2) basis applies, and how is consent collected from helpers, from people without accounts and from children?
3. Is a DPIA mandatory, and is prior consultation needed?
4. How far does client-side encryption reduce our duties?
5. How do erasure and consent withdrawal work in a shared household?
6. Is the Supabase DPA enough, and are its sub-processors acceptable?
