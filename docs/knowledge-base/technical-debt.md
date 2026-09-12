# Technical debt and follow-up work

The 2026-09-12 audit covers the reviewed revision in [audit-baseline.json](audit-baseline.json). It recorded ten findings: four `prod-break`, one `ship-break`, four `latent`, and one documentation `hygiene` issue. These labels describe source/configuration failure paths, not confirmed production incidents.

This repository is public. Detailed new security findings, affected entry points, exact reproduction commands and sanitized raw results are retained in the private maintainer audit bundle **KB-AUDIT-20260912**. Obtain that bundle from the project maintainer before implementing a restricted item. Do not publish its runnable probes into an issue, PR or the generated index while the findings remain unfixed.

The original ten typed claims, evidence, frozen ranker output and historical graph context are preserved in that bundle. The priority order below is the unchanged ranker's output; it is not a new scoring system. A finding stays open until its original claim is explicitly superseded by fix and acceptance evidence. Eight application/configuration findings remain open; KB-06 (test collection) and KB-10 (marketing authoring) are recorded source fixes. Deployed acceptance is separate.

## Ranked application work

| Order | Tracking ID | Workstream | Status and acceptance |
| ---: | --- | --- | --- |
| 1 | KB-01 | Billing state consistency | Open; restricted reproducer and event/state acceptance cases in the private bundle. |
| 2 | KB-02 | Privileged-account administration | Open; restricted target/actor authorization cases in the private bundle. |
| 3 | KB-03 | Tenant-safe administrative responses | Open; restricted response-boundary cases in the private bundle. |
| 4 | KB-04 | Tenant-safe candidate access | Open; restricted data-scope and cache cases in the private bundle. |
| 5 | KB-05 | Consent workflow recovery | Open; failure/retry and dependent-workflow acceptance in the private bundle. |

Use a bounded implementation branch, a regression test in an actually collected runner, independent review and the applicable release checks for each item. A source fix or passing synthetic test alone does not establish deployed acceptance.

## Additional findings

The ranker keeps latent items outside its top slice when five higher-severity findings occupy it. These remain work to track.

| ID | Finding | Next action |
| --- | --- | --- |
| KB-06 | **26 existing Node suites are outside standard collection at the reviewed baseline.** They span route, email, script and shared-code tests. | **Recorded source fix:** [test-unit.mjs](../../scripts/test-unit.mjs) now globs `app/**`, `emails/**`, `shared/**` and `scripts/**` node:test files (including `.cjs`), stubs `server-only` with the existing [stub](../../tests/server-only-stub.cjs), and keeps explicit Vitest/real-DB skips. [Coverage gate](../../tests/test-runner-coverage.test.ts) asserts every product suite has exactly one collecting lane, with `graph/evidence/` audit probes and `lib/auth/roles.test.ts` remaining explicit exceptions. Three previously invisible failures were aligned with current intended behavior (learning-completion mid-flight retry returns `fresh`; counselor resume upload scans the atomic swap helper; process-retries loads under the stub). Original omitted-collection evidence is retained privately. CI/merge acceptance is still required; this does not close remaining WAP-19 skip/hour-drift/placeholder work. |
| KB-07 | **Root pnpm resolution does not satisfy the intended override ranges.** `@xmldom/xmldom` resolves 0.8.12 against `^0.9.10`; `fast-uri` resolves 3.1.0 against `>=3.1.2`. | Put constraints in effective pnpm configuration, regenerate the frozen lock and validate affected consumers. No CVE, exploitability or runtime outage is established. Compare [manifest](../../package.json), [workspace settings](../../pnpm-workspace.yaml) and [lockfile](../../pnpm-lock.yaml). |
| KB-08 | **Astryx resolves StyleX 0.19.0 outside its declared `^0.18.3` peer range.** | Select a compatible declared pair and verify the actual shared dialog/search consumers. The lockfile proves a compatibility-contract mismatch; no component malfunction has been demonstrated. |
| KB-09 | **The transaction escape hatch needs environment enforcement.** | Review the controlled proof and environment acceptance in the private bundle. Source inspection does not establish deployed flag values; see [data boundaries](data.md). |
| KB-10 | **Marketing authoring instructions cited missing components/examples and described an active build as a spike.** | Corrected in this KB change: [authoring guide](../../marketing/AGENTS.md) and [README](../../marketing/README.md) use existing components/layout, real forms and the active Astro-to-Next build path. Original frozen-source evidence is retained privately. No runtime source changed for this correction. |

## Structural debt and navigation hazards

These observations help plan work; they are not extra ranked defects:

- **Training assignment is not one object.** `CourseEnrollment` is the durable assignment; `User.enrolledProgram` is a redundant pointer that some recap/staff paths still trust. Three writers still bypass [upsertEquivalentCourseEnrollment](../../lib/member/courseEnrollmentAssignment.ts). Replacement order is in [architecture](architecture.md#what-is-redundant-breaking-or-due-for-replacement). KB-06 (test collection) did not collapse this.
- **Four program catalogs.** App `PROGRAMS`, marketing `PROGRAMS` (TWC hours), tenant `OrganizationProgramCatalog`, and Prisma `Course` / B4B live lists answer different questions. Eight shared slugs already disagree on contact hours under an explicit skip list.
- **Shared boundary concentration.** Prisma, authentication, tenant/GUC and role helpers have many static references. Use [incoming-reference lookup](README.md) before changing them. Reference counts are not runtime request volume.
- **Two public rendering systems.** Astro output is copied into Next's `public/`, while dynamic routes and middleware also shape public URLs. Establish the actual owner and deployment precedence before migrating an overlapping URL.
- **Configuration-dependent database protection.** Application checks, GUC transport, database roles and RLS enforcement are separate controls. Source cannot certify the deployed schema or role.
- **External effects cross database boundaries.** Auth creation, billing, email, voice and learning providers need explicit retry/reconciliation behavior. A transaction or Git revert does not roll back another service.
- **Historical documents look authoritative.** The catalog retains dated audits, design exports and prior deployment material. Follow [document authority](README.md#what-is-authoritative) and update the affected guide in the implementing PR.
- **The old audit map is partial.** Its five seeded clusters cover part of the repository. The complete generated inventory and scoped evidence supplement it; a clean seeded map does not clear the whole application.

## Active release and historical backlog

WAP-14 [PR 2258](https://github.com/mabrown040/workforceap-beta/pull/2258) now carries the reviewed source policy for fixture-recipient suppression, bulk and delegated pacing, shared request deadlines, request-lifetime retention, delivery accounting, and placement-survey pre-acceptance/idempotency state. That is source and CI evidence, not released or mailbox-delivery evidence: record the final immutable head, auditor15 disposition, merge, deployment, and production acceptance separately. Two actual scheduled Sunday weekly-recap runs without relevant 429s remain the timed operational gate; provider acceptance, synthetic tests, and a successful build cannot substitute for those observations.

Previous [audit reports](../../graph/reports) and claim batches remain intact. Reconcile their open/verified/superseding records before treating them as current priorities. This register does not inherit every historical `open` status or mark an item fixed because a nearby file changed.

For a selected fix, track the KB ID, private claim/reproducer reference, reviewed source revision, owner, regression runner and release acceptance. Preserve original evidence, append the disposition and update this register. New durable rules remain proposed until explicitly accepted under the repository's audit workflow.
