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

| Branch | Purpose | Rules |
| --- | --- | --- |
| `main` | Production. Always deployable. | Changes only through a release PR from `develop`, or a hotfix PR. No direct pushes. |
| `develop` | Integration of finished work. | Changes only through PRs from work branches. No direct pushes. |
| `feature/<short-name>` | New functionality | Branch from `develop`, PR back into `develop`. |
| `fix/<short-name>` | Bug fixes | Branch from `develop`, PR back into `develop`. |
| `chore/<short-name>`, `docs/<short-name>` | Tooling, config, docs | Branch from `develop`, PR back into `develop`. |
| `hotfix/<short-name>` | Urgent production fix | Branch from `main`, PR into `main`, then merge `main` back into `develop`. |

- **One change per branch.** Keep branches small and short-lived. Use kebab-case names, e.g. `feature/household-profile`.
- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/), e.g. `feat: add household profile form` or `fix: keep ticks after reload`.
- **Work branches are squash-merged into `develop`**, so `develop` has one commit per change. **Release PRs from `develop` to `main` use a merge commit**, so the history shows each release.
- **Delete a branch** after it's merged.

## CI/CD (GitHub Actions)

| Trigger | What runs |
| --- | --- |
| Pull request into `develop` or `main` | install, lint, type check, production build (static export + service worker) |
| Merge into `develop` | the checks above, then a preview deployment on Vercel |
| Merge into `main` | the checks above, then a production deployment on Vercel |

A pull request can be merged only when all checks pass. Tests join the pipeline once they exist.
