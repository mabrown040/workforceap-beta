# Audit coverage and publication record

The reviewed application revision is in [audit-baseline.json](audit-baseline.json). This work provides a repository-wide tracked-file index and targeted source/behavioral audits. It does not claim every branch of every file was executed or that production is free of security defects.

## Coverage

| Perspective | Review performed | Evidence and limit |
| --- | --- | --- |
| Dependencies/build | Separate auditor traced root/marketing manifests and locks, overrides, peer contracts, CI and Astro/Next delivery. | All 64 root and four marketing direct dependency specifications match the reviewed lockfiles; two range-contract failures reproduced. No vulnerability scan, provider call or component-outage claim. |
| Identity, tenant and PII | Separate auditor traced selected administrative handlers, shared data helpers, middleware and scope controls. | Three restricted findings reproduced by actual source with synthetic auth/database/provider dependencies. No real member data or live request was used. |
| Test collection and reachability | Separate auditor traced Node/Vitest/Playwright collection, CI, active Astro pages, redirects and authoring references. | 595 test-like files classified at the frozen source; 26 Node suites omitted by standard collection. Broken marketing instructions corrected in this documentation work. Collection analysis is not test execution or proof of a product failure. |
| Production hot paths | Root traced selected external-state, database and workflow recovery boundaries. | Three controlled source probes reproduced restricted reliability failures. No real database, billing or provider operation. |
| Tooling/documentation review | Independent reviewer checked source-backed prose, extraction safety, file navigation and CI; root reviewed tool changes and reproduced audit assertions. | Focused fixtures verify the index/query/link behavior. No app dependency, product runtime or historical migration was changed for the KB. |

Reviews ran in bounded waves while the separate active release worker retained ownership. The three delegated auditors sealed their scopes without reading peers' new claims. Root received dependency findings before sealing its separately scoped hot-path review; this is not represented as four simultaneous blind audits.

## Findings and private evidence

Ten findings were recorded: four `prod-break`, one `ship-break`, four `latent`, one `hygiene`. Eight application/configuration findings remain open; KB-06 (Node collection) and KB-10 (marketing authoring) are recorded source fixes in this KB. [Technical debt](technical-debt.md) provides public tracking IDs and next actions.

Because this application repository is public, **KB-AUDIT-20260912** is a private maintainer bundle containing all ten typed claims, exact source anchors, runnable probes, raw results, original graph context, a byte-identical current-run snapshot and output from the unmodified ranker. Root reran all ten declared verification commands and inspected their output; each reproduced its stated failing assertion or configuration property. An initial corrected harness error is retained and explicitly excluded from supporting evidence.

The existing graph schema, ranker, rule gate, historical claims and records are unchanged in the public repository. `AUDIT_RUN_ID` labels but does not filter ranker input, so the private ranking used `AUDIT_GRAPH_DIR` with only this run's sealed batches. No new rules were silently accepted, and unrelated product fixes were not bundled into the KB.

## Index and diagrams

The [summary](generated/summary.json) supplies exact counts and a deterministic input-tree hash. Every tracked input path is accounted for, including assets and historical material; generated output is checked separately. Private dotenv/key/database paths, symlinks, submodules and missing paths are metadata-only. Untracked/ignored files and installed dependencies are outside the index.

The index extracts JS/TS imports/exports and declarations, Next routes/layouts/HTTP methods, Astro filename route patterns, declared Prisma data/relations, cron declarations, environment names, package declarations, test candidates/runner selection and Markdown headings. See [maintenance](maintenance.md#what-the-static-tools-know) for extraction limits. The old seeded audit map has five clusters and 109 files; the new full inventory supplies the broader navigation layer.

The [architecture guide](architecture.md) and [data guide](data.md) provide focused Mermaid views. Complete Prisma and area-dependency diagrams are separate generated `.mmd` artifacts. Diagrams and static guard references do not prove runtime routing, authorization, deployed schema or provider activation.

## Acceptance and refresh

The PR records focused tooling test results, deterministic index/check results, local Markdown source/anchor checks and Mermaid syntax validation. The dedicated [KB workflow](../../.github/workflows/knowledge-base.yml) verifies source/index drift without initializing the application or accessing a database. Branch protection determines whether the check is required.

Update the relevant human guide and regenerate the index in the implementation PR. The [maintenance procedure](maintenance.md) explains staging new files, provenance, Git/GBrain boundaries and how to attach live acceptance separately. Active notification work and future scheduled-run checks remain in the release record; they are not inferred from this audit.
