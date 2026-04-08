# Lifecycle, notifications, and automation hooks — implementation memo

This document maps **where state mutates**, **what side effects run**, and **where orchestration should plug in** for WorkforceAP. Claims are tied to concrete routes and modules in this repo as of the doc date.

---

## 1. Source-of-truth fields and tables (high level)

| Concern | Primary persistence | Notes |
|--------|---------------------|--------|
| Member identity + program slug | `User` (`enrolledProgram`, `enrolledAt`, `coursesCompleted` JSON, etc.) | Read across almost all portals. |
| Formal training enrollment row | `CourseEnrollment` (1:1 `userId`) | Schema comment: mirrors `User.enrolledProgram`; holds admin enroll metadata, funding, workspace email. |
| Partner ↔ member link | `PartnerReferral` | Drives partner portal lists and `sendPartnerMilestoneEmail` lookup (`findFirst` by `memberId`). |
| Counselor ↔ member | `CounselorAssignment` | Admin assigns counselor; messaging thread updated. |
| Pipeline / kanban stage | `User.pipelineBoardStage` **or** derived | `lib/pipeline/stage.ts` `getPipelineStage()` — manual column wins, else derived from apps, enrollment, courses, certs, `PlacementRecord`. |
| Placement (partner UI, digest, pipeline) | `PlacementRecord` | Unique `userId`; used in partner bundle, `getPipelineStage`, admin placements UI. |
| Placement (grant / outcomes form) | `PlacedOutcome` | Separate model; admin API `POST /api/admin/members/[id]/placed-outcome`. **Not** the same row as `PlacementRecord`. |
| Member activity / automation signals | `MemberEvent` | Written via `lib/events/track.ts` `trackEvent()` and `POST /api/events` (client `postMemberEvent`). Used by crons for inactivity. |
| Partner-facing audit trail | `PortalWorkflowEvent` | `lib/portal/workflowEvents.ts` — only a **subset** of partner/employer actions call this. |
| Email prefs (member) | `User.notificationsUpdates`, `User.notificationsReminders` | Honored by `/api/cron/weekly-recap` and `/api/cron/inactive-nudge` (and duplicate `/api/cron/automations`). |
| Email prefs (partner) | `Partner.notifyOnEnrollment`, `notifyOnCourse`, `notifyOnCertified`, `notifyOnPlaced` | **Persisted** but **not** enforced by `lib/notifications/partner-notify.ts` (see gaps). |

---

## 2. Dependency map by lifecycle area

### 2.1 Member creation

| Entry point | Tables / models touched | Side effects | Notifications | Events |
|-------------|---------------------------|--------------|---------------|--------|
| `POST /api/apply/signup` — `app/api/apply/signup/route.ts` | `User` upsert (`enrolledProgram`, `enrolledAt`), `Profile` upsert, `Application` create (`ApplicationStatus.PENDING`) | Supabase `signUp` | None in-route | `trackEvent` → `apply_signup_completed` after transaction |
| `POST /api/admin/members/create` — `app/api/admin/members/create/route.ts` | `User` create, `Profile` create, optional `PartnerReferral`, optional `MemberSubgroup` | Supabase invite/create user | `sendPartnerMilestoneEmail(..., 'Program enrollment')` if partner path | **None** |
| `app/api/invite/accept/route.ts` — `finishNewUserDbSetup` / `acceptExistingUser` | `User` (program for member invites), roles, profile, partner subgroup links, etc. | Varies by invite type | Invitation accepted email to inviter | **None** in sampled member-accept path |

**Gap — User vs `CourseEnrollment`:** Self-serve and admin create set `User.enrolledProgram` but **do not** create/update `CourseEnrollment` in these flows. Only `POST /api/member/enroll` and `PATCH /api/admin/members/[id]/program` upsert `CourseEnrollment` in sync with `User` (verified in those files). **Risk:** reporting or automation that reads only `CourseEnrollment` will miss members created via apply signup or admin create until something else writes the row.

---

### 2.2 Partner assignment (referral)

| Entry point | Tables | Side effects | Notifications | PortalWorkflowEvent |
|-------------|--------|--------------|---------------|---------------------|
| `PATCH /api/admin/members/[id]/partner` — `app/api/admin/members/[id]/partner/route.ts` | `PartnerReferral` delete/create | — | `sendPartnerNewMemberAssignedEmail` | **No** |
| `PATCH /api/partner/referrals/[memberId]` — `app/api/partner/referrals/[memberId]/route.ts` | `PartnerReferral.assignedPartnerUserId` | — | None | **Yes** — `recordPartnerWorkflowEvent` kind `referral_assign` |

**Gap:** Admin referral reassignment is partner-visible but does not emit `PortalWorkflowEvent`; partner self-serve assignment does.

---

### 2.3 Enrollment changes

| Entry point | Tables | Notes |
|-------------|--------|--------|
| `POST /api/member/enroll` — `app/api/member/enroll/route.ts` | `User` + `CourseEnrollment` upsert (transaction) | Partner milestone email + member `sendCourseEnrolledEmail` |
| `PATCH /api/admin/members/[id]/program` — `app/api/admin/members/[id]/program/route.ts` | `User` (program, `coursesCompleted` cleared, `enrolledAt`), `CourseEnrollment` upsert | `sendPartnerMilestoneEmail` |
| `PATCH /api/admin/program-change-requests/[id]` — `app/api/admin/program-change-requests/[id]/route.ts` | `ProgramChangeRequest`, on approve `User.enrolledProgram` only | **No** `CourseEnrollment` update in this route |
| `app/api/invite/accept/route.ts` | `User.enrolledProgram` for member invitation | **No** `CourseEnrollment` in snippet reviewed |

**Gap:** Approved program change updates `User` only — can desync from `CourseEnrollment.programSlug` if a row exists.

---

### 2.4 Course completion

| Entry point | Tables | Notifications | MemberEvent |
|-------------|--------|---------------|-------------|
| `POST /api/member/courses/complete` — `app/api/member/courses/complete/route.ts` | `User.coursesCompleted` JSON array append | `sendPartnerMilestoneEmail` (`Course completed`), `sendCourseCompletedEmail` to member | **None** (`trackEvent` not called here) |

**Gap:** Inactivity / recap crons use `MemberEvent` for “last activity”. Course completion does not append an event, so **a member who only completes courses may look inactive** if they generate no other tracked events.

---

### 2.5 Certification

| Entry point | Tables | Notifications | MemberEvent |
|-------------|--------|---------------|-------------|
| `POST /api/member/certifications` — `app/api/member/certifications/route.ts` | `UserCertification` upsert/delete | `sendPartnerMilestoneEmail` on first earn only | **None** |

---

### 2.6 Placement

| Entry point | Model | Notifications | Partner prefs | Other |
|-------------|-------|---------------|---------------|--------|
| `POST /api/admin/placements` — `app/api/admin/placements/route.ts` | `PlacementRecord` upsert, `AuditLog` | `sendPartnerMilestoneEmail('Job placement')` **only when first placement** (`!prior`) | Not checked | Pipeline stage uses this for `placed` |
| `POST /api/admin/members/[id]/placed-outcome` — `app/api/admin/members/[id]/placed-outcome/route.ts` | `PlacedOutcome` upsert | **None** in file | Not checked | Grant/metrics oriented (schema comment) |

**Systemic risk:** Two placement concepts (`PlacementRecord` vs `PlacedOutcome`). Partner portal and `getPipelineStage` use **`PlacementRecord`**. Outcomes form does not notify partners or sync the other table.

**Cron:** `GET /api/cron/weekly-recap-email` counts **`PlacementRecord`** (`prisma.placementRecord.count`), not `PlacedOutcome`.

---

### 2.7 Partner notifications

| Mechanism | Implementation | Honors `Partner.notifyOn*` ? |
|-----------|------------------|-------------------------------|
| Milestone emails | `lib/notifications/partner-notify.ts` `sendPartnerMilestoneEmail` | **No** — sends if `PartnerReferral` + `contactEmail` + Resend |
| New member assigned | `sendPartnerNewMemberAssignedEmail` | **No** |
| Weekly digest | `GET /api/cron/partner-outcome-digest` — `app/api/cron/partner-outcome-digest/route.ts` | **Partial** — filters partners with `notifyOnEnrollment: true` only; digest content includes certs/placements from last week regardless of other flags |

**Duplicated status mapping:** Pipeline labels for partners use `lib/pipeline/stage.ts` (`PIPELINE_STAGE_LABELS`). Employer job/application status mapping lives in separate modules (e.g. `lib/employer/jobPostingApplicationStatus.ts`, `lib/employer/aiMatchPipelineLabels.ts`) — different domains, but similar “enum → label → badge” pattern in multiple places.

---

### 2.8 Inactivity, recap, scheduled jobs

| Cron path | Schedule (`vercel.json`) | Behavior | Prefs |
|-----------|--------------------------|----------|-------|
| `/api/cron/weekly-recap` | `0 18 * * 0` (Sun 18:00 UTC) | `generateWeeklyRecap` + `sendWeeklyRecapEmail`; `MemberEvent` `weekly_recap_generated` | `notificationsUpdates: true`, enrolled |
| `/api/cron/inactive-nudge` | `0 10 * * *` | `MemberEvent` groupBy for 7d idle + users with no events; `sendInactiveNudgeEmail` | `notificationsReminders: true` |
| `/api/cron/automations` | **Not in `vercel.json`** | Same logic as inactive-nudge (duplicate) | Same |
| `/api/cron/weekly-recap-email` | `0 22 * * 5` | Admin email: new users, `placementRecord` count, at-risk via `MemberEvent`, pending applications | N/A (admin) |
| `/api/cron/applicant-followup` | `0 11 * * *` | Stale `Application` PENDING; applicant + admin emails | **No** member email prefs checked |
| `/api/cron/partner-outcome-digest` | `0 13 * * 1` | Partner weekly digest | `notifyOnEnrollment` on partner query only |

---

## 3. Systemic risks (prioritized)

1. **`User` vs `CourseEnrollment` drift** — Enrollment can change on `User` without updating `CourseEnrollment` (program change approval, invite accept, legacy flows). Automation keyed only on `CourseEnrollment` will be wrong.

2. **`PlacementRecord` vs `PlacedOutcome`** — Different APIs and UIs; partner-facing pipeline uses `PlacementRecord`. Outcomes-only updates won’t surface as partner “placed” without integration.

3. **Partner DB flags ignored for transactional emails** — `notifyOnCourse`, `notifyOnCertified`, `notifyOnPlaced` are not read by `sendPartnerMilestoneEmail`; partner settings page is read-only for changes.

4. **`MemberEvent` coverage gaps** — Core lifecycle actions (enroll, course complete, certification) often don’t emit events; crons that infer activity from `MemberEvent` undercount real progress.

5. **`PortalWorkflowEvent` partial coverage** — Partner-visible admin actions (e.g. referral assignment from admin) don’t always write workflow events; debugging “what changed” is inconsistent.

6. **Duplicate inactive automation** — `app/api/cron/automations/route.ts` duplicates `inactive-nudge` but is **not** scheduled in `vercel.json` (dead code path unless invoked manually).

7. **Applicant follow-up ignores member notification preferences** — Stale application emails send regardless of `notificationsUpdates` / `notificationsReminders`.

---

## 4. Suggested future automation / event architecture

**Short term (minimal coupling):**

- Introduce a single **domain service per aggregate** (e.g. `EnrollmentService`, `PlacementService`) called from API routes only, each responsible for: (1) transactional DB updates for both `User` and `CourseEnrollment` where applicable, (2) optional `MemberEvent` with a **small closed vocabulary** of lifecycle events, (3) optional `enqueuePartnerNotification` that reads `Partner` flags before calling Resend.

**Medium term (cleaner orchestration):**

- Outbox pattern: write lifecycle facts to a `DomainEvent` / `Outbox` table in the same transaction as state changes; a worker or cron dispatches email, `PortalWorkflowEvent`, and external webhooks. This removes Resend and partner email calls from request paths and makes retries safe.

- Unify **placement** into one user-facing write path that updates `PlacementRecord` (and optionally mirrors to `PlacedOutcome` for grants) so partners and crons see one truth.

**Contract for `MemberEvent`:** Either expand `EventName` in `lib/events/track.ts` for enroll/complete/cert/placement, or stop using `MemberEvent` for inactivity and use **last meaningful activity** derived from source tables (similar to `lib/recap/generate.ts` already using direct counts).

---

## 5. Files / functions to treat as high-risk when changing behavior

| Area | Path | Why |
|------|------|-----|
| Apply + DB bootstrap | `app/api/apply/signup/route.ts` | Creates `User` + `Application`; sets program; no `CourseEnrollment`; one `trackEvent`. |
| Enrollment (self-serve) | `app/api/member/enroll/route.ts` | Only self-serve path that syncs `User` + `CourseEnrollment` + partner email. |
| Enrollment (admin) | `app/api/admin/members/[id]/program/route.ts` | Clears `coursesCompleted`; upserts `CourseEnrollment`. |
| Program change approval | `app/api/admin/program-change-requests/[id]/route.ts` | Updates `User` only — sync risk. |
| Invite accept | `app/api/invite/accept/route.ts` | Multiple branches; member program updates without `CourseEnrollment` in reviewed paths. |
| Course complete | `app/api/member/courses/complete/route.ts` | Mutates `coursesCompleted`; partner + member email; no `MemberEvent`. |
| Certifications | `app/api/member/certifications/route.ts` | Partner email; no `MemberEvent`. |
| Placement (pipeline) | `app/api/admin/placements/route.ts` | `PlacementRecord` + audit + partner milestone. |
| Placement (outcomes) | `app/api/admin/members/[id]/placed-outcome/route.ts` | `PlacedOutcome` only; no partner notification. |
| Partner emails | `lib/notifications/partner-notify.ts` | All milestone emails; ignores `notifyOn*` flags. |
| Partner workflow | `lib/portal/workflowEvents.ts` | Partner/employer audit log. |
| Member analytics events | `lib/events/track.ts`, `app/api/events/route.ts` | Canonical `MemberEvent` write path; `EventName` union is the contract. |
| Pipeline stage | `lib/pipeline/stage.ts` | Single source for partner digest / kanban **derived** stage. |
| Crons | `app/api/cron/*.ts`, `vercel.json` | Only listed paths run on schedule; `automations` is duplicate/off-schedule. |

---

## 6. DB: migrations, queries, index gaps

**Migrations:** `prisma/migrations/` holds **65** SQL migrations (incremental portal/partner/employer/WIOA/messaging changes). Production DDL truth = applied migration history + `schema.prisma`.

**Query / index risks (verified patterns):**

- **`MemberEvent` groupBy crons** — `app/api/cron/weekly-recap-email/route.ts`, `inactive-nudge/route.ts`, and `automations/route.ts` call `prisma.memberEvent.groupBy({ by: ['userId'], _max: { createdAt: true } })` **without a time bound**, so work scales with **table size**. Schema has separate indexes on `userId`, `eventName`, and `createdAt` (`prisma/schema.prisma` `MemberEvent`), but **no composite** `(user_id, created_at)` optimized for “last event per user”.
- **At-risk counting** — After groupBy, code filters users in JS and runs another `user.count` — fine at small scale; under load, consider **SQL-side** aggregates or materialized “last activity” per user.
- **Partner digest** — `partner-outcome-digest` loops partners and loads referrals with nested member data — typical N+1 pattern; monitor as referral volume grows.

**Recommendation:** Run `EXPLAIN ANALYZE` on production-like data for `member_events` groupBy before adding indexes; composite index on `(user_id, created_at DESC)` is a common fix if the planner scans heavily.

---

## 7. Notifications: sends, recipients, prefs, duplicate logic

**Send surfaces:**

- **`lib/email.ts`** — Member and admin transactional mail (recap, nudge, applications, jobs, invites, etc.).
- **`lib/notifications/partner-notify.ts`** — `sendPartnerMilestoneEmail`, `sendPartnerNewMemberAssignedEmail` (partner contact email from `Partner`, not per–partner-user).

**Preference enforcement:**

| Pref | Where stored | Enforced by |
|------|----------------|-------------|
| `User.notificationsUpdates` | DB | `GET /api/cron/weekly-recap` |
| `User.notificationsReminders` | DB | `inactive-nudge`, `automations` |
| `Partner.notifyOn*` | DB | **Not** enforced for milestone emails; **partial** on `partner-outcome-digest` (`notifyOnEnrollment` only in query) |

**Duplicate / brittle logic:**

- **`inactive-nudge` vs `automations`** — Same implementation pattern; only `inactive-nudge` is scheduled in `vercel.json`.
- **Partner milestone** — One function for all milestone types; prefs not branched; no idempotency token in code.
- **`applicant-followup`** — No member opt-out check.

---

## 8. Events: mutations → emit gaps (matrix)

| Mutation area | `MemberEvent` (`trackEvent` / `POST /api/events`) | `PortalWorkflowEvent` |
|---------------|--------------------------------------------------|-------------------------|
| Apply signup | Yes (`apply_signup_completed`) | No |
| Admin member create | No | No |
| Self-serve enroll | No | No |
| Admin program patch | No | No |
| Program change approved | No | No |
| Invite accept (member program) | No | No |
| Course complete | No | No |
| Certification earned | No | No |
| `PlacementRecord` upsert | No | No |
| `PlacedOutcome` upsert | No | No |
| Admin partner referral assign | No | No |
| Partner referral owner assign | Via partner API | Yes (`referral_assign`) |
| Employer job / application updates | Some `trackEvent` on employer routes | Yes (employer workflow helpers) |

**Note:** Client `postMemberEvent` covers **UI** actions (dashboard, admin review), not full server lifecycle coverage.

---

## 9. Tests: coverage on lifecycle paths

**Unit tests** (`**/*.test.ts`, not e2e): ~20 files under `lib/`, `emails/` — strong on **pure helpers** (auth, member status, employer matching, email HTML). **No** dedicated tests for `app/api/member/enroll`, `courses/complete`, `certifications`, `admin/placements`, or crons.

**E2E** (`tests/e2e/*.spec.ts`): Portal smoke, auth, signup, employer/partner auth, revenue flows — **navigation / smoke**, not lifecycle invariants or email side effects.

**Gap:** No regression tests for **User ↔ CourseEnrollment** consistency or **partner notify** flags.

---

## 10. Portal UI: screens → backend dependencies

| Route group | Representative pages | Primary reads / writes |
|-------------|----------------------|-------------------------|
| `app/(portal)/dashboard/**` | `page.tsx`, `program`, `learning`, `profile`, `weekly-recap` | `User` (enrollment, prefs), program catalog, `WeeklyRecap`, client `postMemberEvent` |
| `app/(portal)/partner/**` | `page`, `referred-members`, `outcomes`, `attention`, `milestones` | `PartnerReferral` bundle, `PlacementRecord`, `memberEvent` lists, `portalWorkflowEvent` on attention |
| `app/(portal)/employer/**` | `page`, `jobs`, `applications`, `pipeline` | `Job`, `AIJobMatch`, `JobPostingApplication`, employer APIs |
| `app/(portal)/counselor/**` | `page`, `students`, `messages` | `CounselorAssignment`, member fields on `User` |

**Surfacing risk:** Member/partner UIs overwhelmingly reflect **`User`** + **`PlacementRecord`**. Anything written only to **`CourseEnrollment`** or **`PlacedOutcome`** may **not** match what members and partners see.

---

## 11. Automations: jobs and hook model

**Scheduled jobs (`vercel.json`):** `weekly-recap` (Sun 18:00 UTC), `inactive-nudge` (daily 10:00 UTC), `applicant-followup` (daily 11:00 UTC), `weekly-recap-email` (Fri 22:00 UTC), `partner-outcome-digest` (Mon 13:00 UTC). All require `Authorization: Bearer ${CRON_SECRET}`.

**Hook model today:** **Inline** — HTTP handlers and crons call Prisma + Resend + `trackEvent` directly. **No** queue, **no** outbox table, **no** unified “domain event” emitter for lifecycle.

**Evolution:** See §4 — domain services + optional outbox for retries, deduplication, and webhook fan-out.

---

## 12. Claude / implementer handoff notes

1. **Enrollment:** Any new write to `User.enrolledProgram` must be evaluated against **`CourseEnrollment`** (upsert or intentional omission).
2. **Placement:** Clarify **`PlacementRecord`** (partner pipeline) vs **`PlacedOutcome`** (grant form) before automating “placement” notifications or metrics.
3. **Partner email:** Wire **`Partner.notifyOn*`** into `sendPartnerMilestoneEmail` (or per-milestone helpers) before trusting UI toggles (when editing becomes available).
4. **MemberEvent:** Either emit events for enroll/complete/cert or **stop** using unbounded `groupBy` for “activity” — prefer **derived last-activity** from source tables or add **composite DB index** after profiling.
5. **Cron duplication:** Remove or alias `app/api/cron/automations` vs `inactive-nudge` to avoid drift.
6. **Tests:** Add **API-level** tests for program-change approval and placement creation **before** refactors that touch those paths.

---

## 13. Validation note

This memo was built by **reading** the referenced files and `prisma/schema.prisma` in-repo. Re-run grep for `enrolledProgram`, `courseEnrollment`, `trackEvent`, `sendPartner`, `recordPartnerWorkflowEvent`, and `placementRecord` / `placedOutcome` when behavior changes. For DB performance claims, validate with `EXPLAIN ANALYZE` on target environments.
