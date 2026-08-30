# Approved Coursera curriculum v2 rollout

Status: implemented as a dormant, additive release. External track activation remains gated.

Live B4B catalog proof on 2026-08-30 found 15 of 26 approved provider
bindings available and 11 missing. See
`docs/coursera/approved-curriculum-api-validation-2026-08-30.md`.

## Decision

The three board-approved curricula are immutable version `2026-approved-v2`:

| Program | Approved denominator | Coursera courses | WorkforceAP labs | Syllabus SHA-256 |
| --- | ---: | ---: | ---: | --- |
| User Experience & Interface Design | 8 | 7 | 1 | `6ac3ac7d95b30786356fbc702245ac0ea42d5410594aa6add3629bdf2385ff08` |
| Database Administrator (DBA) | 9 | 9 | 0 | `f1c3f8eb3838bc76bc7863b72ab7245ca5f632131cde28775f1b212037a1289f` |
| Management Analyst & Business Intelligence | 11 | 10 | 1 | `49079c1479a516089f3a374dbcbc35dc2b0b267eb99c22b22db93ea9777a41af` |

The exact ordered provider IDs and explicit legacy aliases live in
`lib/content/programCurriculumManifest.ts`. Regulated titles, hours, and
descriptions continue to come only from `shared/programSyllabi.ts`.

## Data flow

```text
Coursera event / launch request
             |
       normalize provider ID
       Course~abc -> abc
             |
  CourseEnrollment(program, curriculumVersion)
             |
  versioned mapping candidates[]
       /          |          \
  no match    one match    multiple assigned matches
  raw only    one target    fan out to exact targets
       \          |          /
       immutable versioned course list
             |
     X / Y rollup and milestones
```

The existing one-to-one admin mapping table remains untouched for currently
deployed legacy code. `coursera_curriculum_course_mappings` is additive and
allows the same provider ID in more than one program/version. This avoids a
migrate-before-build window in which old production code would disagree with
the new constraint.

## Assignment and progress invariants

- Every enrollment is pinned to a curriculum version at creation.
- Retries and upsert updates never change an existing enrollment's version.
- Existing and provider-discovered learners fail closed to `legacy-v1`.
- Provider validation and rollout are separate gates. A track must be marked
  `validated` with a non-null collection ID, then move through
  `assignmentMode: canary` before broad `assignmentMode: enabled` enrollment.
  Merely validating a collection never opens normal enrollment writers.
- `CourseProgress`, raw Coursera progress, and legacy source rows are not
  deleted or rewritten by the schema migration.
- A completed fact never demotes; removed legacy courses remain historical but
  do not count in a v2 denominator.
- Local WorkforceAP lab modules count in Y and intentionally have no fake
  Coursera provider ID. They open a version-authorized portal lab page and
  are reported separately from the Coursera mapped/unmapped denominator.
- Retired program-slug aliases reuse the existing logical enrollment instead
  of creating a second canonical row; the stored curriculum version remains
  immutable.
- A shared provider ID fans out only across exact learner assignments. Any
  partial target failure leaves the event unprocessed and returns a retryable
  server error so a later assignment cannot be silently lost.
- Approved launches require the exact validated collection ID to remain
  visible in B4B. A missing collection fails closed inside WorkforceAP and
  never falls back to a public `/learn` URL or a legacy umbrella.

## Activation gate

Before changing any manifest `externalTrack.status` to `validated`:

1. Prove every approved binding against the organization catalog API with
   `pnpm coursera:validate-approved-catalog`. Fail on a missing/duplicate ID,
   non-Course type, or provider-slug drift. Organization catalog extras are
   expected and never enter the denominator.
2. Create a new Coursera learning path; do not edit the current learner path.
3. If that collection is exposed by the B4B programs API, run
   `pnpm coursera:validate-approved-track -- --program <wap-slug> --collection <id>`
   and require an exact ordered match. If Coursera does not expose the learning
   path through B4B, capture attended Admin UI evidence of the same exact
   set/order instead; catalog validation alone does not prove path membership.
4. Record the exact collection ID in the manifest and set
   `assignmentMode: canary`; do not set `enabled` yet.
5. Complete and verify the version-aware Skill Missions and pathway-step
   completion guards. The implementation filters missions against the
   learner's immutable assigned course list, versions non-legacy mission
   events, rejects unassigned mission mutations, and records displayed pathway
   indices against the pinned denominator. Until that code is merged and
   deployed, this remains a hard blocker to a v2 canary.
6. Deploy the completed version-aware portal code and migrate the additive
   tables.
7. Assign one clean, explicitly authorized canary learner through a reviewed
   canary-only operation (`activeCurriculumVersion(..., { explicitCanary:
   true })`) while retaining a v1 learner as the regression control. No public,
   member, invite, or ordinary admin endpoint exposes that override.
8. Verify launch, enrollment, xAPI/B4B receipt, X/Y rollup, and exactly-once
   milestones before changing `assignmentMode` to `enabled`.

Rollback is to set `assignmentMode: disabled` first, then return the manifest
status to `pending` if provider validation is no longer trustworthy. Do not
relabel v2 learners as v1 and do not delete provider or local progress facts.

## Verification matrix

- Manifest: order, counts, hours, syllabus hashes, provider IDs, local labs,
  aliases, and legacy overlap.
- Mapping: plain, `Course~`, and `Specialization~` IDs; shared-course
  assignment intersection; unassigned ambiguity remains raw-only.
- Schema: additive enrollment version and versioned mapping table; legacy
  mapping constraint preserved; no progress mutation.
- Portal: v1 and v2 denominators, assigned-course launch guard, approved
  provider ID before legacy index fallback, exact collection pinning, local
  lab pages, and version-aware member/staff/partner/employer read surfaces.
- Enrollment: member and admin endpoints validate against the pinned course
  list and reject pending external v2 tracks.
- Release: Prisma validate/generate, focused tests, full unit suite, typecheck,
  lint, migration checks, production build, and a disposable-Postgres migration
  rehearsal.

## Not in scope

- Mutating a live Coursera learning path or spending a learner seat.
- Moving an existing learner from v1 to v2.
- Deleting retired course progress.
- Faking completion for local labs.
- Declaring the three v2 tracks live before exact provider membership is
  verified.
