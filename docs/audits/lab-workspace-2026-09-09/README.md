# Original practice labs and a human evidence review cycle

Members assigned the frozen legacy IBM IT Support curriculum can now open four
original support labs from their existing lab outline. They work with supplied
fictional tickets, logs, and files, save private written evidence, explicitly
submit a snapshot, receive counselor rubric feedback, and submit a revision.
The counselor portal has a dedicated queue and a review record for each attempt.

## Instructional scope

- Ticket triage: 60 planned minutes; distinguish observations, hypotheses, and
  authorized next actions for a slow workstation.
- Network diagnosis: 75 planned minutes; compare supplied diagnostic evidence,
  explain uncertainty, and design a useful verification test.
- Safe recovery: 75 planned minutes; use an asset inventory and supplied checksum
  to plan a permission-aware restore and record what is still unverified.
- Support handoff: 90 planned minutes; repair a flawed case record, choose the
  next owner, and communicate a defensible resolution or escalation.

The four briefs contain 20 steps, 16 written deliverables, and 20 rubric criteria.
Each criterion has explicit 0/1/2 descriptors. Scenarios and rubrics are original;
linked primary technical references support the concepts. Every required material
is text; learners can use a phone, screen reader, or dictation without paid
software, screenshots, administrator access, or changes to a real device.

These are five hours of **planning estimates** for starter practice. Instructional
owner review and learner time validation are pending. This does not deliver or
approve the entire 58-hour outline, change the pinned 160-hour assignment, verify
independent device performance, or establish external certification readiness.
The member interface states those boundaries where the labs are opened.

## Evidence and review behavior

Saving never shares the draft. Explicit consent submits a fixed copy of the
responses, optional artifact URL, lab brief, content version, and rubric version.
External linked files can still change; only the submitted text and URL are
snapshotted. Later private edits do not replace submitted evidence.

Assigned active counselors and administrators in the member’s organization can
review submitted work. Staff cannot read private lab drafts through this feature.
Unassigned work remains visible to organization admins, with a member-profile
link for arranging a counselor assignment. There is no promised response time or
new external notification.

Every decision stores the authenticated reviewer’s identity, role, time, rubric
scores, and feedback. Scores below 2 require a revision request. A new submission
keeps earlier attempts and reviews intact; duplicate reviews and conflicting
saves are rejected. A later content version can collect fresh evidence while
retaining historical versions. Transferring an enrollment cannot expose a prior
owner’s draft. No lab operation changes course completion, attended hours,
provider progress, or credential records.

## Verification evidence

- [Real local API cycle](api-cycle.json): 30 checks spanning private saves,
  consent, member/counselor/admin isolation, stale and concurrent writes,
  immutable evidence, rubric review, resubmission, and unchanged course and
  credential counts.
- [Member browser flow](member-browser-verification.json): actual form saves,
  persistence after reload, edits during a pending save, failed-send retry, and
  explicit submission. The simulated failure is marked as a fixture.
- [Visual matrix](visual-verification.json): member and counselor views at 375,
  768, and 1440 pixels in both themes, with settled viewport assertions.
- [Database access proof](rls-verification.json): 26 assertions using a nonowner
  PostgreSQL role, including hidden drafts, tenant and assignment isolation,
  forged reviewer denial, and immutable submissions/reviews. The entire probe
  transaction was rolled back.
- [Backend verification](backend-verification.md) and [UI verification](member-ui-verification.md)
  describe the focused regression coverage and source review fixes.

All write verification uses synthetic members in a disposable local PostgreSQL
database on port 55437 and normal Supabase SSR cookies against a local fixture
issuer. No production member evidence, paid AI provider, or external message is
part of these checks. Release build and final verification results are recorded
in the pull request.

## Deployment and recovery

`20260909130000_member_lab_evidence` adds three tables, tenant/member access
policies, immutable evidence triggers, and bounded data constraints. It updates
no existing learner or provider records. Production uses the repository’s guarded
migration build; development uses only the fixed migration on the disposable
database. The preview bootstrap accepts only the validated direct DEMO target,
checks the complete schema contract, and refuses partial or altered schemas.

Rollback the application deployment if needed. Retain the additive tables and
submitted evidence; dropping them would destroy learner work. A failed migration
is transactional and requires inspecting the actual failure before any recovery
action. The existing homepage, provider assignments, and completion paths are
outside this change.
