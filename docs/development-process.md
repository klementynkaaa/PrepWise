# Development process

## Foundation comes first

No feature work (household profile, plan, action list) starts until these three are done, in this order:

1. **CI/CD.** GitHub Actions runs on every pull request and deploys automatically (see below).
2. **Mockups.** Every screen and state in the first-session flow and the action list is drawn and reviewed before it's built.
3. **Design system.** Colour, typography and spacing tokens, plus the shared components the mockups use. It's built for large system font sizes, screen readers and Polish text from day one.

Features are then built against the approved mockups using only design-system tokens and components.

## Branches

```
feature/…  fix/…  chore/…  docs/…
        │  pull request (squash merge)
        ▼
     develop ──▶ preview deployment
        │  release pull request (merge commit)
        ▼
       main ───▶ production deployment
```

| Branch                                    | Purpose                        | Rules                                                                               |
| ----------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| `main`                                    | Production. Always deployable. | Changes only through a release PR from `develop`, or a hotfix PR. No direct pushes. |
| `develop`                                 | Integration of finished work.  | Changes only through PRs from work branches. No direct pushes.                      |
| `feature/<short-name>`                    | New functionality              | Branch from `develop`, PR back into `develop`.                                      |
| `fix/<short-name>`                        | Bug fixes                      | Branch from `develop`, PR back into `develop`.                                      |
| `chore/<short-name>`, `docs/<short-name>` | Tooling, config, docs          | Branch from `develop`, PR back into `develop`.                                      |
| `hotfix/<short-name>`                     | Urgent production fix          | Branch from `main`, PR into `main`, then merge `main` back into `develop`.          |

- **One change per branch.** Keep branches small and short-lived. Use kebab-case names, e.g. `feature/household-profile`.
- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/), e.g. `feat: add household profile form` or `fix: keep ticks after reload`.
- **Work branches are squash-merged into `develop`**, so `develop` has one commit per change. **Release PRs from `develop` to `main` use a merge commit**, so the history shows each release.
- **Delete a branch** after it's merged.
- **Name a roadmap branch after its change ID**, e.g. `feature/household-profile` or `chore/ci-quality-gates`, so its issue updates itself (see below).

## CI/CD (GitHub Actions)

| Trigger                               | What runs                                                                    |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| Pull request into `develop` or `main` | install, lint, type check, production build (static export + service worker) |
| Merge into `develop`                  | the checks above, then a preview deployment on Vercel                        |
| Merge into `main`                     | the checks above, then a production deployment on Vercel                     |

A pull request can be merged only when all checks pass. Tests join the pipeline once they exist.

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
