# Coursera Integration — Backlog

Captures the cool things we can now do with the B4B + xAPI data flow that landed in #1069 / #1074 / #1075 / #1076. Top 3 are in flight; the rest are queued.

## In flight (parallel agents)

1. **Landing URL audit + swap** — replace generic `coursera.org/learn/...` links across member views with the org-scoped program URL B4B returns (e.g. `https://www.coursera.org/programs/workforce-advancement-project-8a3f0`). Logged-in learners bounce straight into the right context; logged-out ones see the right org sign-in page.

2. **Real-time progress from B4B** — ~~replace xAPI-derived `%` on `/dashboard/training` and the program rollups with authoritative `enrollmentReports[].overallProgress` from Coursera.~~ **Landed on default kit `/dashboard` (2026-07):** kit home pulls B4B (4s fail-soft) into `getMemberState` → `progressPercentDisplay`; legacy path already had this. xAPI stays the event stream; B4B is SOT for "where am I?".

3. **Multi-course schema migration** — drop the unique constraint on `CourseEnrollment.userId`, add `isPrimary: boolean`. UI on `/dashboard/training` becomes a tabbed switcher across all enrolled programs. Removes the "dominant program picking" hack from #1076.

### Also landed (identity truth, 2026-07)

- **Portal-email auto identity link** — `lib/coursera/ensurePortalEmailIdentity.ts` (+ `.server.ts` wiring) + `dashboardAutoSync`: on dashboard visit (within backoff), upsert `coursera_identity_mappings` from portal email when missing, backfill orphaned `coursera_*_progress.user_id`, replay unresolved xAPI. Runs even when local `CourseProgress` already exists so partial progress still attaches historical rows.

---

## Queued

### Member-facing UX

- **Switch-program flow** — explicit "Switch program" action on `/dashboard/program`. Confirms with the member, marks current `CourseEnrollment` as `withdrawn`, creates new row, optionally calls Coursera's `POST /programs/{newProgramId}/programEnrollments` to enroll them on the Coursera side too. Counselor gets notified.
- **Item-level grades on member detail** — pull `courseGradebookReports` per member, render quiz scores + assignment grades on the admin/counselor member detail page. Members see "you scored 95 on quiz X" not just "in progress".
- **Hours-of-learning visible to learner** — `approxTotalLearningHrs` from gradebook reports surfaced on member dashboard ("you've put in 12.4 hours this month").

### Engagement / retention

- **Stale-learner re-engagement cron** — daily job: anyone with `lastActivityAt > 14 days` and `overallProgress > 0` gets a re-engagement email. Track open / click / re-engage in `Email` + `MemberEvent` tables.
- **Drop-detection alerts** — Coursera shows enrolled but `overallProgress = 0` after 7 days → flag in `/admin/pipeline` as at-risk. Counselor outreach trigger.
- **Auto-enroll on assessment completion** — when a member completes the WAP placement assessment, POST `/programs/{programId}/programEnrollments` to enroll them in the recommended Coursera program. Removes the "now go find this course on Coursera" friction.

### Counselor / admin tools

- **Manager view: my caseload** — counselor sees authoritative B4B progress for their N assigned members. Replaces xAPI-derived guesses. Refreshable on demand.
- **Cohort hours dashboard** — `approxTotalLearningHrs` aggregated across the org, sliced by program / cohort / date range. Funder-grade outcome reporting.
- **Skill score visualization** — uses the legacy enterprise endpoint `getSkillScoreForLearners` to render per-skill mastery (e.g. "Networking: 78%, Cybersecurity: 62%"). More substantive than completion percentages.

### Compliance / outcomes

- **Cert verification feed** — nightly cron pulls completed enrollments, creates matching `Certification` rows in WAP automatically, with provenance pointing at the Coursera completion record. Funder-grade audit trail.
- **Outcome data hardening** — when WAP claims a placement, cross-check that the placed member completed the program per Coursera's record. Inconsistencies surface for review.

### Auth / SSO

- **Deep-link with externalId hint** — current best-effort handoff. We send members to org-scoped URLs; Coursera handles login. Acceptable for v1.
- **SAML federation** (medium effort) — configure WAP as IdP; Coursera For Business supports SAML 2.0. Members sign into WAP, click "Open Coursera," land already-logged-in.
- **SCIM provisioning + invite-on-enroll** (highest leverage, longest lift) — when WAP enrolls a member in a program, SCIM auto-provisions them in Coursera. Single onboarding flow, no double-account confusion.

### Future-state (already documented separately)

- **Auto-invite on Coursera join** — see [`docs/COURSERA-INVITE-ON-JOIN.md`](./COURSERA-INVITE-ON-JOIN.md). Deferred until FERPA / consent / decline-mechanism sign-off.

---

## Endpoints we have proven access to

From the prod self-test (commit `dca5ae`):

| Endpoint | Use | Status |
|---|---|---|
| `GET /api/businesses.v1/{orgId}` | Org info | ✅ 200 |
| `GET /api/businesses.v1/{orgId}/users` | Roster | ✅ 200 |
| `GET /api/businesses.v1/{orgId}/programs` | Program catalog | ✅ 200 |
| `GET /api/businesses.v1/{orgId}/contents` | Content catalog | ✅ 200 |
| `GET /api/businesses.v1/{orgId}/enrollmentReports` | Per-learner progress | ✅ 200 |
| `GET /api/businesses.v1/{orgId}/courseGradebookReports` | Item-level grades | ✅ 200 |
| `POST /api/businesses.v1/{orgId}/programs/{programId}/programEnrollments` | Enroll learner | Documented in YAML, not yet exercised |
| `POST /api/businesses.v1/{orgId}/programs/{programId}/invitations` | Invite learner | Documented, not exercised |
| `DELETE /api/businesses.v1/{orgId}/programs/{programId}/memberships/{programId~externalId}` | Remove learner | Documented, not exercised |
| `GET /api/rest/v1/enterprise/programs/{programId}/skillsets` | Skill data | Legacy, in YAML |

---

## How to pick the next batch

When closing items off the queued list, prefer:

1. **Items with the largest learner-facing UX impact first** (real-time progress, switch flow, item-level grades)
2. **Then funder / outcome reporting** (cert feed, hours dashboard)
3. **Then long-tail compliance** (SAML, SCIM, drop-detection)

SSO work is a separate ~1 week workstream; queue it only when the deep-link approach actually breaks in practice.

---

*Update this doc when items move from queued → in flight → landed. Drop new ideas in "Queued."*
