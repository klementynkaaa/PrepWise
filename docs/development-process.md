# Development process

## Foundation comes first

No feature work (household profile, plan, action list) starts until these three are done, in this order:

1. **CI/CD.** GitHub Actions runs on every pull request and deploys automatically (see below).
2. **Mockups.** Every screen and state in the first-session flow and the action list is drawn and reviewed before it's built.
3. **Design system.** Colour, typography and spacing tokens, plus the shared components the mockups use. It's built for large system font sizes, screen readers and Polish text from day one.

Features are then built against the approved mockups using only design-system tokens and components.

## Branches

```
feature/…  bugfix/…  refactor/…  chore/…  docs/…
        │  pull request (squash merge)
        ▼
     develop ──▶ preview deployment
        │  release pull request "chore(release): …" (merge commit)
        ▼
       main ──▶ staging ──▶ smoke check ──▶ owner approval ──▶ production ──▶ tag + release
        │
        └─ sync pull request main → develop (merge commit, after every release or hotfix)

hotfix/…  branches off main, pull request into main (merge commit), then a sync pull request
```

| Branch                                    | Purpose                             | Rules                                                                                        |
| ----------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| `main`                                    | Production. Always deployable.      | Changes only through a release PR from `develop`, or a hotfix PR. No direct pushes.          |
| `develop`                                 | Integration of finished work.       | Changes only through PRs from work branches, plus the sync PR from `main`. No direct pushes. |
| `feature/<short-name>`                    | New functionality                   | Branch from `develop`, PR back into `develop`.                                               |
| `bugfix/<short-name>`                     | Bug fixes                           | Branch from `develop`, PR back into `develop`.                                               |
| `refactor/<short-name>`                   | Restructuring without new behaviour | Branch from `develop`, PR back into `develop`.                                               |
| `chore/<short-name>`, `docs/<short-name>` | Tooling, config, docs               | Branch from `develop`, PR back into `develop`.                                               |
| `hotfix/<short-name>`                     | Urgent production fix               | Branch from `main`, PR into `main`, then a sync PR from `main` into `develop`.               |

- **One change per branch.** Keep branches small and short-lived. Use kebab-case names, e.g. `feature/household-profile`.
- **Commit messages and PR titles** follow [Conventional Commits](https://www.conventionalcommits.org/), e.g. `feat: add household profile form` or `fix: keep ticks after reload`. Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`, `build`, `revert`. A scope and `!` are allowed (`feat(plan)!: …`).
- **Work branches are squash-merged into `develop`**, so `develop` has one commit per change. **Release PRs from `develop` to `main` use a merge commit**, so the history shows each release.
- **Branches are deleted automatically** after they're merged. The rulesets protect `develop` and `main` from deletion.
- **Name a roadmap branch after its change ID**, e.g. `feature/household-profile` or `chore/ci-quality-gates`, so its issue updates itself (see below).

### Rules by branch level

Rulesets enforce this on GitHub. They are kept as code (see Repository settings below).

| Rule                    | Draft PR                            | PR into `develop`                                               | PR into `main`                                             |
| ----------------------- | ----------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| CI that runs            | build, unit tests, `PR conventions` | all five gates and `PR conventions`                             | all five gates and `PR conventions`                        |
| Required checks         | none (a draft can't be merged)      | all five gates and `PR conventions`                             | all five gates and `PR conventions`                        |
| Branch up to date       | none                                | not required                                                    | required                                                   |
| Approvals               | none                                | 0                                                               | 0 (production is approved in the `production` environment) |
| Conversation resolution | none                                | required                                                        | required                                                   |
| Merge methods           | none                                | squash for work branches; merge commit for the sync PR only     | merge commit only                                          |
| Allowed source branches | none                                | `feature/ bugfix/ refactor/ chore/ docs/`, and `main` (sync PR) | `develop` and `hotfix/*`                                   |
| Force push, deletion    | none                                | blocked                                                         | blocked                                                    |
| Bypass actors           | none                                | none                                                            | none                                                       |

The rulesets are named `develop protection` and `main protection`.

## CI/CD (GitHub Actions)

| Trigger                                 | What runs                                                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Draft pull request                      | `Lint, type check, build`, `Unit & integration tests` and `PR conventions` only                                                                              |
| Marking a pull request ready for review | CI runs again with every gate                                                                                                                                |
| Pull request into `develop` or `main`   | every quality gate below, plus `PR conventions`                                                                                                              |
| Merge into `develop`                    | the same gates, then a preview deployment on Vercel                                                                                                          |
| Merge into `main`                       | the same gates, then a staged production deployment, a smoke and health check on it, the owner's approval, promotion to production, and a tag with a release |

Deployment runs only when all five gates pass. Every deployment ships the `out/` folder the browser tests ran against: CI turns it into `.vercel/output` and deploys it with `--prebuilt`, so nothing is rebuilt.

### Quality gates

| Gate                                  | Job name (check name)            | Local command                                                          | Fails when                                                                                                                        |
| ------------------------------------- | -------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Format, lint, types, build            | `Lint, type check, build`        | `format:check`, `lint`, `typecheck`, `build`, `build-storybook`        | formatting, a lint or type error, the export is incomplete, or Storybook doesn't build                                            |
| Unit, integration and component tests | `Unit & integration tests`       | `npm run test:coverage`                                                | a test fails or coverage drops below the floor                                                                                    |
| Offline and accessibility             | `Browser tests (offline + a11y)` | `npm run test:e2e` (after `npm run build`), `npm run test:storybook`   | an offline, installability or accessibility check fails, or a Storybook story has an accessibility violation                      |
| Dependency audit                      | `Dependency audit`               | `npm run audit`                                                        | a high or critical advisory is found (a hotfix may bypass it, see Releases)                                                       |
| Secret scan                           | `Secret scan`                    | none (runs in CI)                                                      | a secret appears in the commits being introduced                                                                                  |
| PR conventions                        | `PR conventions`                 | `node scripts/check-pr.mjs` (needs `PR_TITLE`, `HEAD_REF`, `BASE_REF`) | the PR title isn't Conventional, the branch name is outside the allowed prefixes, or the source branch isn't allowed for the base |

These six job names are the required checks in the `develop protection` and `main protection` rulesets. A pull request can be merged only when all of them pass. A job skipped on a draft reports success, which is safe only because a draft can't be merged and CI runs again when the PR is marked ready.

## Releases

A release is a pull request from `develop` into `main`.

1. **Open the release PR** from `develop` into `main`. Its title is `chore(release): <short description>`, for example `chore(release): 2026-11-20`. Wait for all six checks, then merge it with a **merge commit**. The branch must be up to date with `main`, which is why the sync PR below matters.
2. **CI deploys and checks.** On `main`, CI runs the gates again, then deploys the tested `out/` as a staged production deployment (not on the production domain yet). `Smoke & health (staging)` loads every route, checks the manifest and service worker, and checks that `/version.json` shows the commit being released.
3. **Approve production.** `Promote to production` waits for the owner. Open the run in the GitHub Actions tab, choose **Review deployments**, select `production` and approve or reject. Approving runs `scripts/vercel-promote.mjs`, which calls the Vercel REST API (the CLI's `vercel promote` fails for this token) and puts the staged deployment on the production domain without rebuilding, then checks health on the production domain.
4. **Tag and release.** `Tag release` creates the tag and a GitHub Release with generated notes. The tag is a CalVer tag `vYYYY.MM.DD` using the Europe/Warsaw date. A later release the same day gets `.2`, `.3` and so on, for example `v2026.11.20.2`.

A release left waiting for approval keeps its run in progress. The next push to `main` (a hotfix included) queues behind it, without even running its gates, and a third push replaces the queued one. To ship something newer, approve or reject the waiting release first.

### If promotion fails

`Promote to production` can fail after you approve; nothing goes live in that case, and `Tag release` is skipped. Read the step's log: the script prints the HTTP status of the Vercel call. A 401 or 403 means the Vercel token lacks access to the project; a 404 means the staged deployment or project ID is wrong. Fix the cause (for a workflow or script bug, with a `hotfix/…` PR into `main`), then let the new `main` run stage and promote again. Re-running the failed job reuses the old workflow file, so it only helps for a temporary Vercel error.

### Sync after every release or hotfix

The merge commit of a release or hotfix PR exists on `main` but not on `develop`. Without a sync, the next release PR is behind `main` and can't be merged. After every release or hotfix:

1. The `Tag release` step summary prints the commands. Open a pull request from `main` into `develop`: `gh pr create --base develop --head main --title "chore(release): sync main into develop" --body "Sync after <tag>."`
2. When its checks pass, merge it with `gh pr merge <number> --merge`. **Always a merge commit, never squash.**
3. If a sync PR was squashed by mistake, the next release PR shows as behind. Recover by opening another sync PR from `main` into `develop` and merging it with a merge commit.

CI doesn't open the sync PR itself, because a PR opened with the default workflow token doesn't trigger the required checks.

### Hotfix

Branch `hotfix/<short-name>` off `main` and open a PR into `main`. It runs the same gates, the same staging, smoke check, approval and promotion, and needs the sync PR afterwards. For a hotfix only, a failing dependency audit doesn't block the PR: the job passes with a warning annotation and a step-summary line naming the hotfix branch. The hotfix path has been used end to end (the first release needed two hotfixes), but the audit bypass has never triggered, because `npm audit` passed both times; it is untested.

### Rolling back

If production is broken, run `vercel rollback` (with the Vercel CLI, logged in as the owner) to put the previous production deployment back on the domain. There is no automatic rollback. Then fix forward with a hotfix.

## Repository settings

The branch rules, environments and merge options are kept as code in `.github/`, so they are reviewable and can be re-applied:

| File                                                   | What it holds                                                                                         |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `.github/rulesets/develop.json`, `main.json`           | the `develop protection` and `main protection` rulesets                                               |
| `.github/environments/staging.json`, `production.json` | `staging` (no reviewers) and `production` (the owner approves); both limited to the `main` branch     |
| `.github/repo-settings.json`                           | merge methods (squash and merge commit on, rebase off), delete branch on merge, merge commit messages |

The owner runs `scripts/repo-settings.mjs` by hand, with admin rights through `gh auth`. CI can't change these settings.

| Command                                                      | What it does                                                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `node scripts/repo-settings.mjs --check`                     | compares the live settings with the files and exits non-zero on drift                                               |
| `node scripts/repo-settings.mjs --apply`                     | creates or updates the rulesets, environments and repo settings from the files                                      |
| `node scripts/repo-settings.mjs --remove-classic-protection` | deletes the old classic branch protection on `develop` and `main`, and only once both rulesets exist and are active |

To set up a repository: run `--apply`, then `--check`, then `--remove-classic-protection`. Apply the rulesets only after a PR has reported all six check names at least once, so the required checks exist.

One-time setup that isn't in the files, because it holds secrets or lives in Vercel:

- In Vercel, create **Protection Bypass for Automation**. Smoke runs use it to get past Vercel's deployment protection.
- Add its value as the secret `VERCEL_AUTOMATION_BYPASS_SECRET` in both the `staging` and the `production` GitHub environments. Never commit it or paste it into a PR, issue or log.
- Set the repository variable `PRODUCTION_URL` to the production domain.
- The repository secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` must exist; a `main` run fails without them.

## Roadmap and issues

Every roadmap item (foundations `F-NN` and slices `S-NN`) has a GitHub issue, grouped under a GitHub milestone for the roadmap milestone. The issues are kept in sync automatically.

| What changes                                | Who updates it                                                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Title, description, labels, prerequisites   | The roadmap. `npm run roadmap:sync` copies it to the issues (it runs by itself when an agent edits the roadmap). |
| A pull request for the item is opened       | The `Roadmap issues` workflow labels the issue `status: in-progress`.                                            |
| That pull request is merged into `develop`  | The workflow closes the issue as completed.                                                                      |
| That pull request is closed without merging | The workflow sets the issue back to `status: ready`.                                                             |

A pull request is linked to its issue by its branch name (`<type>/<change-id>`) or by `Closes #N` in its description. The next sync copies `in-progress` and `done` back into the roadmap, so the roadmap stays the place to plan and GitHub the place to track progress. Don't edit a roadmap issue's description by hand; the next sync overwrites it.

Labels on roadmap issues:

| Label                                                                            | Meaning                                             |
| -------------------------------------------------------------------------------- | --------------------------------------------------- |
| `roadmap`                                                                        | Managed by the sync. Only these issues are touched. |
| `type: foundation` / `type: slice`                                               | Groundwork, or a user-visible end-to-end piece.     |
| `status: proposed` / `status: ready` / `status: in-progress` / `status: blocked` | Where the item stands. Closed means done.           |
| `stream: …`                                                                      | Items that share a chain of prerequisites.          |
| `north star`                                                                     | The slice that proves the product works.            |

Prerequisites also appear as native "blocked by" links between issues. Only the roadmap items are published; open questions and parked ideas stay in the local notes, because the repository is public.
