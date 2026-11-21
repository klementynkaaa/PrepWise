# Knowledge base

Everything the plan says lives here: the supply items, the emergency scenarios and the register of sources, with their Polish copy. The app bundles a generated version of it; nothing is fetched at runtime. Architecture: `docs/architecture.md`.

## Files

| File               | Holds                                                                         |
| ------------------ | ----------------------------------------------------------------------------- |
| `sources.json`     | The register of sources an item or scenario can cite                          |
| `items.json`       | Supply items: app fields, Polish copy, optional evidence                      |
| `emergencies.json` | Scenarios: Polish name and explanation, optional evidence, the items they add |

Every entry has an `id`: a kebab-case slug (`drinking-water`). Slugs are written by hand, **never change and are never reused**, because stored household data refers to them. Polish text lives only in `copy`; everything else is English.

## Generated files: never edit

`src/lib/plan/content.generated.ts` and `messages/pl.knowledge.json` are generated. Edit `knowledge/`, then run:

```bash
npm run knowledge        # validate, then regenerate both files
npm run knowledge:check  # validate and compare only (CI runs this)
```

Commit the regenerated files with your change. CI fails when they are stale or any rule below breaks; the errors name the file, the slug and the field.

## Adding an item

Add an object to `items.json` with a new slug:

- `placement`, `unit`, `amount`, `roundStep` and the optional `when` are the app's own item fields. Their shape is defined by `PlanItem` in `src/lib/plan/types.ts`; copy a similar existing item.
- `intendedSource`: `"official"` or `"prepwise"`, what the figure is meant to be (see "What verified means").
- `copy`: `name` and `listName` are required; `note` and `why` are optional. All Polish.
- `evidence`: optional (see below).
- Do not write `verified` or `sourceRef`; they are derived, and the check rejects them.

The Polish text for screens is generated from `copy`; add it nowhere else.

## Adding a scenario

Add an object to `emergencies.json` with a new slug: `copy` (`name`, `explanation`), `intendedSource`, optional `evidence`, and `items`, the slugs of the items it adds. Each listed item must exist in `items.json` and carry `"when": { "emergency": "<scenario slug>" }`; every item triggered by an emergency must be listed by it. A scenario lists only items the baseline lacks, never a baseline item.

## Citing a source

Add the source to `sources.json` once, then cite it by `id` from any evidence:

- `kind`: `"official"` or `"other"`.
- `url`: an https link to the page. `accessedAt`: the date you read it (`YYYY-MM-DD`). `edition`: optional, for versioned documents.
- `archivedUrl`: a snapshot link on `web.archive.org` or `archive.ph`; the check rejects other hosts. Required once an owner-verified figure cites the source.
- `copy`: Polish `title` and `publisher`.

Link plus Wayback only: **do not copy PDFs or pages into the repo.**

An evidence block is `{ sourceId, quote, page?, section?, verifiedBy?, verifiedAt? }`. `quote` is the verbatim text from the source (it may be empty only in a draft). Evidence is checked at build time and not bundled in the app.

## Which sources count as official

A source with `kind: "official"` must be an https page on `gov.pl` or one of its subdomains. That includes the Poradnik bezpieczeństwa, and PSP and RCB pages. Anything else (a news site, a charity, a shop) is `kind: "other"`.

## What verified means

- Only the owner sets `verifiedBy: "owner"`. Agents and other contributors may draft evidence (a source and a quote) **without** `verifiedBy`; a draft is valid and the app shows it as "PREPWISE recommendation".
- When `verifiedBy` is present it must be `"owner"`, and then a non-blank `quote`, a `verifiedAt` date (not in the future) and a resolvable `sourceId` are required, and the cited source needs an `archivedUrl`. Owner-verified evidence that cites an official source needs `intendedSource: "official"`.
- A figure becomes "Official guidance" only when its evidence is owner-verified **and** cites a `kind: "official"` source. An item or scenario with `intendedSource: "official"` whose verified evidence cites a `kind: "other"` source fails the check, so it never ships as PREPWISE by accident.
- Reasons and the full rule: `docs/business-rules.md`.
