# Lab evidence backend verification

The lab workspace persists private drafts, freezes explicitly shared submissions, and returns human feedback against each submission's original rubric. It does not write course completion, attendance, certifications, points, or provider records.

## Request and persistence contract

- `GET /api/member/labs/[labId]` returns the authenticated member's eligible workspace. Assignment comes from the stored `CourseEnrollment`, including its organization and pinned curriculum. The content resolver additionally verifies the exact legacy IT support lab-outline course.
- `PUT` saves only the private draft. `POST .../submit` requires `shareForReview: true` and a nonblank answer for every exact deliverable. Both require the current content version and `expectedDraftRevision`.
- Draft writes compare the supplied revision with the stored revision, use a conditional update, and run in a serializable transaction. A submission stores its answer/link snapshot, original lab definition, rubric version, attempt, and resulting draft revision in the same transaction. A failed operation never reports success; conflicts return HTTP 409 without an automatic retry.
- A submission awaiting review or already reviewed prevents another submission for that content version. A revision request permits another immutable attempt. A newly published content version can start independently; previous versions remain in history.
- Staff reads use the actor's actual organization and active member/counselor records. Same-organization administrators and actively assigned counselors can see submitted evidence. This workflow intentionally does not offer a cross-organization super-admin bypass or self-review.
- Staff feedback is an immutable review with the reviewer's ID, display name, role, rubric version, criterion scores, feedback, and timestamp. Every frozen criterion must be scored exactly once. `reviewed` requires all scores to be 2; otherwise staff must request revision. These are evidence-feedback decisions, not a claim of supervised mastery or credential eligibility.
- Staff never receive private draft answers. Members without an active counselor are told that organization administrators can review submitted evidence and arrange assignment. No staffing or response-time promise is invented.

The exact TypeScript response types and Zod inputs are in [labWorkspaceTypes.ts](../../../lib/member/labWorkspaceTypes.ts). Services are in [labWorkspace.ts](../../../lib/member/labWorkspace.ts).

## Validation

Two focused Vitest suites passed, **42 tests**: [API request boundaries](../../../tests/api/lab-evidence.spec.ts) and [assignment/access/lifecycle rules](../../../tests/lib/lab-workspace-access.spec.ts). Cases cover authentication, spoofed identity, same-origin JSON mutations, explicit sharing, body/text/link limits, invalid deliverables, assigned curriculum/content versions, stale draft ownership after assignment transfer, conditional-write conflicts, immutable snapshots, version-specific resubmission, org/assignment scope, exact rubric criteria, reviewer identity, and the existing counselor profile destination.

The additive migration was applied to the disposable local database by the coordinating agent. Actual non-owner PostgreSQL RLS tests passed **26 assertions**; [rls-verification.json](rls-verification.json) records them. The test role had table grants but neither superuser nor RLS-bypass privileges. The test verified private-draft isolation; member/assigned-counselor/admin evidence access; other-member, unassigned-counselor, other-org and missing-context denials; forged reviewer/role/org rejection; and immutable-update triggers even for the table owner. All probe rows, role creation, and grants were rolled back. Existing local fixture records were preserved.

The HTTP and library suites mock external dependencies; the RLS test exercises real PostgreSQL. Browser acceptance, the real authenticated member/staff round trip, preview bootstrap verification, and broad repository checks are recorded separately by the coordinating agents. This document does not claim production migration application, production learner outcomes, or verified coverage of the full 58-hour outline.
