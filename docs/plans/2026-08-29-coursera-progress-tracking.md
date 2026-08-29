# Coursera Progress Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Coursera learner — linked WAP member or unmatched Coursera identity — has a **validated course list**, a **defensible completion percent**, and **key milestones that fire only from those facts**, visible on admin/counselor surfaces with a kit badge, without requiring an identity mapping first.

**Architecture:** Split authority. The **course list** (what “Y” is in “X of Y”) is the WAP syllabus/catalog plus `coursera_canonical_course_mappings` — never the B4B umbrella `listPrograms` dump. **Per-course % and `isCompleted`** come from B4B `enrollmentReports`. xAPI is the event stream. Unmatched learners stay first-class on `coursera_course_progress`. Milestones are derived from the validated list + those percents, not from enrollment or self-report. Mapping an email later is an attach, not a prerequisite.

**Tech Stack:** Next.js 15 App Router, Prisma/`course_progress` + `coursera_course_progress`, Coursera B4B REST (`lib/coursera/b4bClient.ts`, `b4bSync.ts`), xAPI ingest (`lib/xapi/inboundStatementPipeline.ts`), portal kit `StatusTag` / Astryx `Token` (`inWap` already exists on training + students kits).

## Global Constraints

- **Unmatched is not a defect.** Do not block progress writes on `resolveUserIdByCourseraEmail` returning a user. Mapping is optional attach.
- **No shadow `users` rows** for unmatched Coursera emails. Fake members would leak into WIOA / `MEMBER_ONLY_WHERE` / auth. Progress lives on `coursera_course_progress` until a real user is linked.
- **Do not imply completion before Coursera says complete.** Product stake (`docs/PRODUCT_STAKES.md`): 93% stays `IN_PROGRESS`. Only `isCompleted === true` (B4B) or a course-level xAPI completion verb marks `COMPLETED`. Never promote on a percent threshold.
- **Never demote COMPLETED.** Existing ladder in `computeCourseProgressUpdate` stays: status only moves `NOT_STARTED → IN_PROGRESS → COMPLETED`; `percentComplete` is max; `lastActivityAt` is the later timestamp.
- **Canonical WAP program slug on every write.** `comptia-a-plus` must be stored as `comptia-a-professional-certificate` (see `PROGRAM_SLUG_ALIASES` in `lib/content/programs.ts`). Reads that join enrollment slug to progress slug must use the same helper.
- **Item-level xAPI `completed` is not a course completion.** Keep `isXapiCompletionVerb` excluding `activityType === 'item'`.
- **Test/smoke actors stay hidden** (`isLikelyTestAccount`) on admin rosters. They are not first-class learners.
- **Funder / WIOA totals** (`MEMBER_ONLY_WHERE`) never include unmatched Coursera identities or unmatched progress rows.
- **Kit badge:** unmatched → Astryx `Token` / kit `StatusTag` tone `alert` (needs a look), label **Unmatched**. Linked member with progress but no `CourseEnrollment` / `enrolledProgram` → tone `warn`, label **No program**. Do not invent a third status vocabulary (`docs/KIT_GUIDE.md` §4). Existing copy **"Not in WAP"** on `TrainingProgressKit` / `StudentsRosterKit` becomes **Unmatched**.
- **Portal kit tokens only** (`--wa-*`). No raw hex. Dense admin surface.
- **Dashboard progress semantics** stake: member-facing copy stays truthful (`in progress`, not “complete” at 93%).
- **Course list ≠ B4B umbrella.** `mkProgram` stamps every catalog program with the same `courseraB4BProgramId` (`TpIlAogTQ8-SJQKIE8PP9w`). `loadProgramCourses` prefers B4B live by that id first — if that call returns contents, **every WAP program would share one org-wide course list**. Validated list = syllabus/static courses + canonical Coursera ids. B4B `listContents` / `enrollmentReports` **audit and score** those ids; they do not redefine the curriculum.
- **One percent formula, everywhere.** Per-course % = B4B `overallProgress` (0–100) for that `contentId`, else local `course_progress.percentComplete`. Program % = mean of per-course % over the **validated list only**. Completed count = courses on that list with `isCompleted` or `COMPLETED`. Do not average over extra Coursera enrollments, specializations not on the syllabus, or alias-slug orphans.
- **Milestones fire only from validated facts.** First-class types below. No celebration on item-level xAPI, enterprise-sync backfill, unmatched Gmail, or “% looks high.”

---

## Why this plan exists (prod snapshot 2026-08-29)

Queried production Supabase `jqddnyuszufndwwezdwp`:

| Fact | Number |
|---|---|
| `course_progress` COMPLETED | 6 rows / 2 users |
| Those 2 users' `enrolled_program` | **null**, no `course_enrollments` |
| `member_events.course_completed` | 1 |
| Course-complete notifications | 0 |
| B4B cron | `scanned: 35`, `upserted: 31` (17 known / **14 unknown**), `skippedNoUser: 4` |
| Canonical seed unmatched contents | 35 |
| xAPI `unmatched` events | 4209 (≈4134 test; 3 real emails still firing) |
| Skillset cron | permanent `{ skipped: "no_skillsets_configured" }` |

The API is up. Completions exist. Joins drop them. Unmatched emails are a **display class**, not the reason progress is wrong.

**Accuracy holes already in code (must validate, not just persist):**

1. **Shared B4B program id** — `lib/content/programs.ts` `mkProgram` sets `courseraB4BProgramId: 'TpIlAogTQ8-SJQKIE8PP9w'` on every program. `loadProgramCourses` (`lib/member/loadProgramCourses.ts`) asks B4B for that id first. Seed code already admits the org is one umbrella (`seedCanonicalMappingsFromB4B.ts`). If live contents come back non-empty, the member “X of Y” denominator is the whole org catalog.
2. **Canonical seed: 35 unmatched Coursera contents** — those ids never join the syllabus. Progress for them must not inflate or replace Y.
3. **Admin training %** (`app/admin/training-progress/page.tsx`) sums `percentComplete ?? 0` across `program.courses`. A slug miss looks like 0% and pulls the mean down. That is not “Coursera said 0.”
4. **`memberProgramCompleted`** (`lib/partner/memberProgress.ts`) treats `pct >= 100` as program-complete. A bad denominator or a single 100% row averaged wrong can false-graduate.
5. **Milestones: 0 `milestone_cascades` in prod**, 1 `course_completed` event. `MILESTONE_TYPES` is only `course_completed`, and `completeMemberCourse` never ran for the July finishes (no enrollment). Key milestones are undefined and unfired.

---

## Learner states (first-class)

Every admin/counselor training row is one of:

| State | Identity | Progress store | Badge | Member portal |
|---|---|---|---|---|
| **Linked + enrolled** | `users` + `course_enrollments` (or `enrolledProgram`) | `course_progress` keyed by `(userId, canonicalProgramSlug, courseSlug)` | none / in-WAP | full dashboard |
| **Linked + no program** | `users`, Coursera identity resolved, **no** enrollment | `course_progress` still written (program inferred from Coursera content mapping) | **No program** (`warn`) | training list from progress rows, not from catalog enrollment |
| **Unmatched** | Coursera email / xAPI actor only | `coursera_course_progress.user_id IS NULL` | **Unmatched** (`alert`) | none (no login) |
| **Test** | `isLikelyTestAccount` | ignored on rosters | hidden | n/a |

Mapping unmatched → linked is `POST /api/admin/coursera/map-unmatched` (already exists): stamp `user_id` on CSV/xAPI rows, insert `coursera_identity_mappings`, **promote** into `course_progress`, drop the Unmatched badge. Progress numbers must already be there before the map.

---

## Source-of-truth ladder

```
B4B enrollmentReports.overallProgress / isCompleted
        │  (authoritative % and COMPLETED)
        ▼
coursera_course_progress     ← always, including unmatched
        │
        ├── user resolved ──► course_progress (canonical slugs)
        └── user null     ──► stay here; admin reads this; badge Unmatched

xAPI statements
        │  (activity, item events, course-level completed side-effects)
        ▼
upsertCourseProgressFromXapiStatement  (linked only, after identity resolve)
completeMemberCourse                   (side-effects: emails/points; skip if no program)
coursera_xapi_events                   (audit; unmatched is a status, not a drop)
```

Rules:

1. **B4B wins % and `isCompleted`.** xAPI must not overwrite a higher B4B percent downward; B4B must not demote xAPI `COMPLETED`.
2. **Org-wide cron currently skips unmatched** (`skippedNoUser`). That is the hole. Unmatched must still upsert `coursera_course_progress`.
3. **Org-wide cron currently writes `course_progress` only when a user exists**, and uses discovered/slugify slugs (`comptia-a-plus`, program names as `course_slug`). Writes must go through `canonicalizeProgramSlug` + canonical course mapping; unknown content still stores on `coursera_course_progress` with raw Coursera ids, **not** as fake curriculum slugs on `course_progress`.
4. **Member UI** (`loadMemberProgramTrainingView`) already prefers B4B when `contentId` maps. Keep that. Fix the slug join so enrolled `comptia-a-professional-certificate` sees progress written under the alias.
5. **`cron_coursera_sync` skillsets** stay a no-op until skillset IDs are configured. Out of scope. Do not confuse skillset % with course %.

---

## Accuracy contract: course list, percent, milestones

These three must be independently auditable. If any one is wrong, dashboards lie.

### A. Validated course list (what Y is)

**Authority order for “courses in this WAP program”:**

1. **Board / TWC syllabus** (`shared/programSyllabi.ts` + `Program.courses` after syllabus overlay) — order, titles, hours for regulated programs. Do not silently replace this with Coursera discovery (`docs/plans/2026-07-15-twc-syllabus-accuracy.md`).
2. **Canonical id bind** — each syllabus course must have a real Coursera `courseId` via `coursera_canonical_course_mappings` and/or `DISCOVERED_COURSERA_PROGRAMS` (not `TODO_courseId_*`).
3. **B4B `listContents`** — prove those ids still exist and capture type (`Course` vs `Specialization`). Flag extras and missing ids. **Do not** replace the syllabus with `listPrograms().contents` for the umbrella id.
4. **`Course` DB** — org-scoped cache of the bound list (display order = syllabus order). Used when B4B is down.
5. **Static catalog** — last resort, same slugs as (1).

**Validation rules (fail the audit, do not guess):**

| Check | Pass | Fail |
|---|---|---|
| Every syllabus course has a non-`TODO_` Coursera id | bind exists | row on `/admin/coursera` “unmapped course” |
| Every bound id exists in latest `listContents` | id present | “stale id — Coursera retired/replatformed” |
| `contentType` is `Course` (or explicitly allowed Specialization on syllabus) | type ok | do not count Specialization as one syllabus module unless the syllabus says so |
| Extra B4B enrollments (learner took something off-syllabus) | shown as **Additional Coursera activity**, not in Y | never add to denominator |
| Alias slugs (`comptia-a-plus` vs canonical) | one stored slug | two lists, broken X of Y |
| `loadProgramCourses` B4B-first by shared umbrella id | **must stop** | same Y for every program |

**Implement:** `lib/coursera/programCourseList.ts` → `loadValidatedProgramCourses({ organizationId, programSlug })` that **does not** call `loadProgramCoursesFromB4B` with the shared umbrella id. Keep `loadProgramCoursesFromB4B` only when `Program.courseraB4BProgramId` is a **per-program** id that is not the org umbrella (today it never is — treat the shared id as unset).

**Admin surface:** `/admin/coursera` (or a slim “Catalog health” card) shows per program: `mapped / syllabusCount`, unmatched B4B contents (the 35), stale ids. This is how we *know* the list is accurate — not a one-time spreadsheet.

### B. Validated completion percent (what X and % are)

**Two numbers, never mixed:**

| Name | Formula | Use |
|---|---|---|
| **Course %** | B4B `overallProgress` for that `contentId`, else local `percentComplete` | course row, “93% in progress” |
| **Program %** | `round(mean(course % over validated list))` | hero ring, admin pace, counselor |
| **Completed count (X)** | count of validated courses where B4B `isCompleted` **or** local `COMPLETED` | “3 of 7”, milestones |
| **Program complete** | `X === Y` (every validated course complete) | graduation only — **delete** the `pct >= 100` shortcut in `memberProgramCompleted` |

**Keep:** `averageProgramProgressFromB4B` all-or-nothing (null if any validated id missing from the B4B map) so we do not blend B4B 80% + implied 0% for a course Coursera has not materialized.

**Do not:**

- Treat 93% as complete (stake).
- Average admin `%` with `?? 0` for unmatched slugs (that is a join bug, not 0% progress).
- Use skillset % or gradebook % as the program ring.
- Count off-syllabus Coursera courses in X or Y.

**Reconciliation (how we know % is accurate):**

`lib/coursera/progressReconciliation.ts` builds, per learner × validated course:

```ts
export type CourseProgressReconcileRow = {
  courseraCourseId: string;
  courseSlug: string;
  b4bPercent: number | null;
  b4bCompleted: boolean | null;
  localPercent: number | null;
  localStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | null;
  displayPercent: number;
  displayCompleted: boolean;
  drift: 'ok' | 'local_ahead' | 'b4b_ahead' | 'missing_b4b' | 'missing_local' | 'slug_mismatch';
};
```

`drift` rules: `local_ahead` is OK (xAPI beat B4B; merge ladder). `b4b_ahead` means local write failed — heal. `slug_mismatch` means canonical bind is wrong — catalog ticket, not a learner problem.

Admin member Coursera diagnose (`lib/admin/diagnoseMemberCoursera.ts`) already exists — extend it to render this table. Nightly optional: count `b4b_ahead` + `slug_mismatch` into workflow diagnostics.

**Spot-check set (prod, from the 2026-08-29 audit):** after implementation, these must match Coursera’s own UI within 1% or an explicit `isCompleted` flag:

- Linked PM learners at 93% and 87% Fundamentals — still **in progress**, X=0 for that course.
- July completers (5 + 1 course-level xAPI) — those courses **COMPLETED**, listed under inferred program, badge **No program**.
- Unmatched emails — course rows from B4B if present; % unknown labeled “No Coursera report yet” if only xAPI.

### C. Key milestones (what we celebrate and report)

Lock the allow-list. Extend `MILESTONE_TYPES` in `lib/milestoneCascade/types.ts`. Each type has a **detector** (pure, unit-tested) that reads only validated list + reconcile rows.

| Milestone | When it becomes true | Detector | Side effects (linked + enrolled only) |
|---|---|---|---|
| **`training_started`** | First validated course has `IN_PROGRESS` or `lastActivityAt` or course % > 0 | once per (user, program) | checklist `startFirstCourse`; no email |
| **`first_course_completed`** | X goes from 0 → ≥1 | once per (user, program) | cascade + course-complete email + points |
| **`course_completed`** | Each additional validated course `isCompleted` | once per (user, courseSlug) | cascade (existing); email |
| **`program_halfway`** | X ≥ ceil(Y/2) and Y ≥ 2 | once per (user, program) | cascade only (counselor brief), no member spam |
| **`program_completed`** | X === Y and Y > 0 | once per (user, program) | `handleProgramCompletion` / job-ready path |
| **`training_stale`** | `lastActivityAt` older than 14 days and not program-complete | existing stale cron; not a cascade | counselor at-risk, not a celebration |

**Derived, not milestones:** `JOB_READY_TRAINING_PCT` (70% program %) stays a queue threshold (`lib/member/trainingProgress.ts`). Do not emit a cascade at 70% — that is not Coursera-complete.

**Who gets milestones:**

- Linked + enrolled → full side effects.
- Linked + no program → persist progress + **detect** `training_started` / course completes for admin; **no** member email until enrolled (same as plan side-effects rule).
- Unmatched → **no** milestone rows on a user id. Optional later: org-level “unmatched first completion” admin ping. Not v1.
- `source === 'coursera-enterprise-sync'` → persist progress, **skip** celebration cascades (existing `buildCascadeFromCompletion` rule). First live xAPI/webhook still may fire if it is the first time we *observe* it live — do not double-email if a `MemberEvent` `course_completed` already exists.

**Member checklist** (`getMemberState`) must read the same detectors (`hasStartedTraining`, `hasCompletedFirstCourse`, `allCoursesComplete`) so dashboard milestones and admin cascades cannot disagree.

**Validation fixture (Y=4):** start course 1 → `training_started`. Complete 1 → `first_course_completed` + `course_completed`. Complete 2 → `course_completed` + `program_halfway` (`X >= ceil(Y/2)`). Complete 3 (course 3 still 40% does not count) → another `course_completed` only. Complete 4 → `course_completed` + `program_completed`. Never graduate on mean % alone.

---

## File map

| File | Responsibility |
|---|---|
| `lib/content/programSlug.ts` (new) | `canonicalizeProgramSlug()`, export alias table, `programSlugEquals()` for reads |
| `lib/coursera/upsertCourseraCourseProgress.ts` (new) | Single B4B → `coursera_course_progress` upsert (linked or unmatched) |
| `lib/coursera/b4bSync.ts` | Stop dropping unmatched; remap `lastActivity` → `lastActivityAt`; canonicalize slugs; unknown content only to CSV table |
| `lib/coursera/syncUserFromB4B.ts` | Same remap/canonicalize; already maps `lastActivity` correctly — keep as the per-user path |
| `lib/member/courseProgress.ts` | Reads/writes use canonical slug; rollup keys canonical |
| `lib/member/courseCompletion.ts` | Persist progress even with no enrollment; skip notify/graduation if no program |
| `lib/xapi/inboundStatementPipeline.ts` | Unmatched: still persist statement + `coursera_xapi_events`; do not require enrollment to keep audit; linked + no program: still upsert `course_progress` |
| `lib/member/memberProgramTrainingView.ts` | Join progress by canonical slug; if no enrollment, build view from `course_progress` rows |
| `lib/admin/trainingDashboard.ts` | Include linked-no-program; never require `enrolledProgram IS NOT NULL` to show % |
| `app/admin/training-progress/page.tsx` | Unmatched rows: real `modulesDone` / pace from `coursera_course_progress`; rename badge |
| `app/admin/students/page.tsx` | Same unmatched % + badge rename |
| `components/portal/kit/pages/admin-subviews/TrainingProgressKit.tsx` | Token label `Unmatched`; optional `No program` |
| `components/portal/kit/pages/admin-subviews/StudentsRosterKit.tsx` | Same |
| `lib/coursera/progressQueries.ts` | `loadUnmatchedLearners` must include B4B-backed `coursera_course_progress` rows (not only CSV/xAPI union as today) |
| `lib/coursera/programCourseList.ts` (new) | `loadValidatedProgramCourses` — syllabus + canonical ids; ignore shared umbrella B4B program id |
| `lib/coursera/progressReconciliation.ts` (new) | per-course drift table; program X/Y/% from validated list only |
| `lib/coursera/milestones.ts` (new) | pure detectors for the six key milestones |
| `lib/member/loadProgramCourses.ts` | stop treating shared `TpIlAogTQ8-SJQKIE8PP9w` as a live course-list source |
| `lib/partner/memberProgress.ts` | program complete = X === Y only |
| `lib/milestoneCascade/types.ts` | extend `MILESTONE_TYPES` |
| `lib/admin/diagnoseMemberCoursera.ts` | render reconcile rows |
| Tests | `lib/content/programSlug.test.ts`, `lib/coursera/b4bSync.test.ts` unmatched path, `courseCompletion` no-enrollment persist, `programCourseList.test.ts`, `progressReconciliation.test.ts`, `milestones.test.ts` |

Do **not** mix Astryx primitives inside kit components. Roster tokens already use Astryx `Token` on those kit pages — keep that existing pattern; do not add Astryx inside `components/portal/kit/**` primitives.

---

## Considerations checklist (everything that has to stay true)

### Identity

- [ ] Coursera key is lowercase email (`externalId` / `actor.mbox`). Actor `account.name` without email still lands in `coursera_xapi_events`; progress % still needs B4B email to attach.
- [ ] `coursera_identity_mappings` is attach-only. Auto-heal matching 0/82 forever is acceptable if unmatched rows already show B4B %.
- [ ] Three unmatched production learners become roster rows with progress once B4B stops skipping them — **if** they appear in `enrollmentReports`. If they only emit xAPI, show activity + unmatched badge with % unknown until B4B has a row.
- [ ] Linking later: existing map-unmatched must promote `coursera_course_progress` → `course_progress` via `upsertMergedCourseProgress` / `computeCourseProgressUpdate` (never a blind overwrite).

### Course list accuracy

- [ ] Shared umbrella `courseraB4BProgramId` is not a per-program catalog. `loadValidatedProgramCourses` ignores it.
- [ ] Y = syllabus/catalog length after dropping courses with no bind only from **display of %**, not from secretly shrinking the program — unmapped syllabus courses still count in Y and show “Not linked to Coursera” so staff see the hole.
- [ ] Off-syllabus Coursera activity is a separate list, never mixed into X/Y.
- [ ] Catalog health card: mapped/syllabus, 35 unmatched contents, stale ids.

### Progress semantics

- [ ] Course-level only in member “X of Y complete”. Item-level xAPI updates `IN_PROGRESS` / last activity, not `percentComplete` (already guarded in `upsertCourseProgressFromXapiStatement`).
- [ ] B4B `overallProgress` rounds to 0 on early activity — keep `lastActivityAt` promotion to `IN_PROGRESS` (already in `computeCourseProgressUpdate`). Org-wide cron must actually pass `lastActivity` (API field name), not `lastActivityAt`.
- [ ] Program % = mean of validated course %; missing B4B row → fall back to local, do not coerce to 0 unless the course is truly not started.
- [ ] Program complete ⇔ X === Y. Remove `pct >= 100` in `memberProgramCompleted`.
- [ ] Grades (`score_scaled`, gradebook) are optional overlay, not the completion bit.
- [ ] CSV import remains a manual backfill, not the live path (prod has 3 rows).
- [ ] Reconcile table explains WAP vs Coursera per course (`ok` / `local_ahead` / `b4b_ahead` / `slug_mismatch`).

### Key milestones

- [ ] Allow-list: `training_started`, `first_course_completed`, `course_completed`, `program_halfway`, `program_completed`, plus existing stale signal (not a celebration).
- [ ] Detectors are pure functions over validated list + reconcile rows; checklist and cascades call the same functions.
- [ ] No milestone email to unmatched; no cascade on enterprise-sync backfill; no cascade at 70% job-ready threshold.

### Enrollment vs progress

- [ ] **Enrollment** (`course_enrollments` / `enrolledProgram`) gates member catalog + seat approval (`courseraEnrollmentApproved`). It must **not** gate persistence of observed Coursera progress.
- [ ] `completeMemberCourse` today throws `No program enrolled` (7 prod xAPI errors). Split: (a) write/upsert progress from Coursera course id → canonical mapping without enrollment; (b) emails/points/graduation only when an enrolled program exists.
- [ ] Org-wide `b4bSync` must not invent `CourseEnrollment` for unmatched people (that would be a paid-seat / WIOA lie).
- [ ] Linked + no program: infer display program from the canonical mapping of the most-recent / highest-progress course. Badge **No program** until staff enrolls them.

### Slugs and catalog

- [ ] Export `canonicalizeProgramSlug(raw: string): string` from a dedicated module wrapping `PROGRAM_SLUG_ALIASES` (today the map is **private** in `programs.ts`).
- [ ] Also canonicalize **course** ids via `coursera_canonical_course_mappings` (251 prod rows; seed still reports 35 unmatched contents). Unmatched contents: store Coursera `contentId` + name on `coursera_course_progress` only; do not slugify program titles into `course_progress.course_slug` (current 0% `comptia-a-plus` / `it-support-professional-certificate-ibm` pollution).
- [ ] Reads: `progressByKey.get(`${userId}:${programSlug}:${course.slug}`)` on `/admin/training-progress` must try canonical slug **and** aliases, or normalize keys at write time only (prefer write-time).
- [ ] `DISCOVERED_COURSERA_PROGRAMS` keys (`comptia-a-plus`) vs WAP catalog (`comptia-a-professional-certificate`) — `WAP_PROGRAM_DISCOVERED_ALIASES` already maps for catalog load; **writers** still emit the discovered key. Fix writers.

### Surfaces (who sees what)

| Surface | Linked+enrolled | Linked+no program | Unmatched |
|---|---|---|---|
| `/dashboard`, `/dashboard/program` | B4B % + local fallback, canonical slug | show courses from `course_progress` + No program banner | N/A |
| `/admin/training-progress` | pace row | pace row + No program | row + Unmatched, real % |
| `/admin/students` | existing | include (today skipped if no enroll) | already appended; fix % / label |
| `/admin/coursera/learners/unmatched/[email]` | — | — | keep drill-down; feed from B4B table |
| Counselor / partner | same as admin, MEMBER scoped | same | **exclude** from partner outcome emails; optional counselor “Coursera-only” queue later (not v1) |
| Public impact / WIOA | enrolled members only | enrolled only | **exclude** |

### Crons

- [ ] `cron_coursera_b4b_sync` — primary writer. Must upsert unmatched. Log `upsertedUnmatched` alongside `skippedNoUser` (skipped only when email missing entirely).
- [ ] `cron_coursera_auto_heal` — keep; success is no longer “matched: 0 is failure” if progress already tracked.
- [ ] `cron_coursera_training_sync` / skillset — out of scope.
- [ ] Per-user dashboard auto-sync (`lastCourseraAutoSyncAt`) — still the path that can set `enrolledProgram` when null (`decideEnrolledProgramSync`). Do **not** let org-wide cron overwrite a non-null enrollment (existing rule).

### Side effects

- [ ] Course-complete email / points / `handleProgramCompletion` / milestone cascade: **linked + enrolled only**. Unmatched and no-program persist progress silently (`notify: false`).
- [ ] Do not send “you completed” to an unmatched Gmail we have never onboarded.

### Multi-tenant / RLS

- [ ] `coursera_course_progress.organization_id` must be stamped on unmatched B4B upserts (default org `workforceap` when the email is not yet a user). Do not leave `organization_id` null (those rows vanish from tenant-scoped admin loaders).

### Observability

- [ ] Workflow diagnostic for B4B: `upsertedKnown`, `upsertedUnknown`, `upsertedUnmatched`, `skippedNoEmail`.
- [ ] Do not alert on unmatched identity as P0 if progress is landing.

---

## Recommended approach (locked)

**Keep three stores, one view model** — do not nullable-`course_progress.userId` (Postgres unique would allow duplicate NULL user ids; every member query would need OR-external-email).

```ts
// lib/coursera/learnerProgressView.ts (target shape)
export type LearnerProgressIdentity =
  | { kind: 'user'; userId: string; unmatched: false; noProgram: boolean }
  | { kind: 'coursera'; externalEmail: string; unmatched: true };

export type CourseProgressFact = {
  courseraCourseId: string;
  programSlug: string; // canonical WAP slug when known, else null
  courseSlug: string | null;
  percentComplete: number;
  isCompleted: boolean;
  lastActivityAt: Date | null;
};
```

Admin kits already accept `inWap?: boolean`. Extend with `noProgram?: boolean` rather than a new table UI.

---

### Task 1: Canonical program slug helper (write + read)

**Files:**
- Create: `lib/content/programSlug.ts`
- Create: `lib/content/programSlug.test.ts`
- Modify: `lib/content/programs.ts` — move/re-export `PROGRAM_SLUG_ALIASES` through the helper (keep `getProgramBySlug` behavior)

**Interfaces:**
- Produces: `canonicalizeProgramSlug(raw: string): string` — trim, lower, alias lookup, else return trimmed slug
- Produces: `programSlugsEquivalent(a: string, b: string): boolean` — `canonicalizeProgramSlug(a) === canonicalizeProgramSlug(b)`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalizeProgramSlug, programSlugsEquivalent } from '@/lib/content/programSlug';

describe('canonicalizeProgramSlug', () => {
  it('maps discovered CompTIA key to WAP catalog slug', () => {
    assert.equal(
      canonicalizeProgramSlug('comptia-a-plus'),
      'comptia-a-professional-certificate',
    );
  });
  it('is idempotent on canonical slugs', () => {
    assert.equal(
      canonicalizeProgramSlug('comptia-a-professional-certificate'),
      'comptia-a-professional-certificate',
    );
  });
  it('treats alias and canonical as equivalent', () => {
    assert.equal(
      programSlugsEquivalent('comptia-a-plus', 'comptia-a-professional-certificate'),
      true,
    );
  });
});
```

- [ ] **Step 2: Run** `node --import tsx --test lib/content/programSlug.test.ts` — expect FAIL (module missing)

- [ ] **Step 3: Implement helper** by lifting `PROGRAM_SLUG_ALIASES` into `programSlug.ts` and having `programs.ts` import it so there is one map

- [ ] **Step 4: Re-run tests** — expect PASS

- [ ] **Step 5: Commit** `feat(coursera): canonicalize program slugs on a single helper`

---

### Task 2: Org-wide B4B sync writes unmatched + remaps lastActivity + stops slug pollution

**Files:**
- Modify: `lib/coursera/b4bSync.ts` (`fetchEnrollmentReports` mapping, main loop around `skippedNoUser`, `computeCourseProgressUpdate` call site)
- Modify: `lib/coursera/b4bSync.test.ts`
- Create: `lib/coursera/upsertCourseraCourseProgress.ts` (Prisma upsert on `@@unique([externalEmail, courseraCourseId])`)

**Interfaces:**
- Consumes: `canonicalizeProgramSlug`, `loadCanonicalMappingsForCourseraIds`, `B4BEnrollmentReport` from `b4bClient.ts` (`lastActivity`, not `lastActivityAt`)
- Produces: `B4BSyncResult` gains `upsertedUnmatched: number`; `skippedNoUser` only when email/externalId empty

Behavior:

1. Normalize API row: `lastActivityAt = report.lastActivity ?? report.lastActivityAt ?? 0` (defensive both names).
2. If no email: `skippedNoUser++`, continue.
3. **Always** upsert `coursera_course_progress` (email, contentId, %, `isCompleted`, org id, `user_id` if resolved).
4. If user resolved **and** canonical mapping hit: `upsertMergedCourseProgress` with **canonical** program/course slugs.
5. If user resolved **and** no mapping: do **not** write `course_progress` with slugify(programName). CSV table is enough until staff maps the course.
6. If user not resolved: stop here (unmatched first-class). Do not create `users`.

- [ ] **Step 1: Extend `b4bSync.test.ts`** with: unmatched email still counted as `upsertedUnmatched` (mock prisma or extract a pure `planB4BRowWrite(report, userId, mapping)` that returns `{ csv: true, canonical: boolean }`)

- [ ] **Step 2: Run existing** `node --import tsx --test lib/coursera/b4bSync.test.ts` plus the new cases

- [ ] **Step 3: Implement loop changes** in `syncCourseraB4BEnrollmentReports`

- [ ] **Step 4: Confirm `lastActivity` fixture** still promotes 0% + activity → `IN_PROGRESS`

- [ ] **Step 5: Commit** `fix(coursera): persist B4B progress for unmatched learners`

---

### Task 3: xAPI + completeMemberCourse persist without enrollment

**Files:**
- Modify: `lib/member/courseCompletion.ts`
- Modify: `lib/xapi/inboundStatementPipeline.ts`
- Modify: `lib/member/courseProgress.ts` (`upsertCourseProgressFromXapiStatement` — if no enrolled program, resolve program from canonical mapping / discovered catalog using `parsed.courseraCourseId` only)

**Interfaces:**
- `completeMemberCourse` still takes `userId`. If no enrollment: upsert `course_progress` via coursera course id mapping, return `{ ok: true, persistedWithoutProgram: true }`, **do not throw**, `notify` forced false.
- Pipeline: unmatched identity unchanged (record `unmatched` event — first-class audit). Linked user: never `error: 'No program enrolled'` for course-level completed.

- [ ] **Step 1: Test** `completeMemberCourse` with a user that has `enrolledProgram: null` but a canonical mapping for the course id — expect a `course_progress` COMPLETED row, no throw

- [ ] **Step 2: Run the test** — FAIL

- [ ] **Step 3: Implement persist-without-program**; keep throw only for `Course not found` when even canonical mapping + discovered catalog miss (true unknown content)

- [ ] **Step 4: Tests pass**

- [ ] **Step 5: Commit** `fix(coursera): persist xAPI completions without WAP enrollment`

---

### Task 4: Member + admin read paths use canonical slugs and unmatched facts

**Files:**
- Modify: `lib/member/memberProgramTrainingView.ts`
- Modify: `lib/member/loadMemberDashboardHome.ts` / `getActiveProgramForDashboard.ts` — if no enrollment but `course_progress` exists, pick canonical program of latest activity as `activeProgramSlug` and set `noProgram: true` for the page banner
- Modify: `app/admin/training-progress/page.tsx` — unmatched: `modulesDone` from completed CSV/B4B rows; `percentComplete` from those rows; `pace` from last activity (not hard-coded `Stalled`); Token **Unmatched**
- Modify: `app/admin/students/page.tsx` — same label; include linked users with null enrollment if they have progress
- Modify: `lib/admin/trainingDashboard.ts` — drop `enrolledProgram: { not: null }` exclusive filter **or** union in progress-only users
- Modify: kit pages label `Not in WAP` → `Unmatched`

**Product copy:** member banner if `noProgram`: “Your Coursera progress is saved. A counselor still needs to enroll you in a WorkforceAP program.” Do not say they completed the program.

- [ ] **Step 1: Unit-test training view** with progress stored as `comptia-a-plus` and enrollment `comptia-a-professional-certificate` — after Task 1+2 writes are canonical this is a backfill; for reads, `programSlugsEquivalent` when matching rows to catalog courses

- [ ] **Step 2: Implement join** in `loadMemberProgramTrainingView` using canonical slug for `bySlug` lookup

- [ ] **Step 3: Manual check** `/admin/training-progress` and `/admin/students` show unmatched % ≠ 0 when `coursera_course_progress` has rows; linked completers with null enrollment appear with **No program**; program % uses Task 8 helper once it lands (land Task 7–8 before trusting X/Y on this page)

- [ ] **Step 4: Commit** `fix(coursera): show unmatched and no-program progress on admin rosters`

---

### Task 5: Backfill production slugs + promote existing COMPLETED orphans (data)

**Files:**
- Create: `prisma/migrations/YYYYMMDDHHMMSS_canonicalize_course_progress_program_slugs/migration.sql` (or a one-shot `scripts/canonicalize-course-progress-slugs.ts` if unique collisions need merge-by-max-percent — prefer script + dry-run because `(userId, programSlug, courseSlug)` collisions are likely)

Collision rule: if both `comptia-a-plus` and `comptia-a-professional-certificate` exist for the same user+course, keep the row with higher `percentComplete` / COMPLETED wins, delete the other, then rename remaining alias rows.

- [ ] **Step 1: Dry-run query** on prod-shaped DB counting alias slugs on `course_progress` and `member_program_progress`

- [ ] **Step 2: Script with `--dry-run` / `--apply`**

- [ ] **Step 3: Do not run `--apply` against production from this PR** unless Mike approves; ship script + local `db:push` verification

- [ ] **Step 4: Commit** `chore(coursera): slug canonicalize backfill script`

---

### Task 6: Map-unmatched promote uses the same merge ladder

**Files:**
- Modify: map-unmatched API (`app/api/admin/coursera/map-unmatched/route.ts` and `lib/xapi/reprocess.ts` / CSV promote in `csvImport.server.ts`)

- [ ] **Step 1: On map**, for each `coursera_course_progress` row for that email: `computeCourseProgressUpdate` + `upsertMergedCourseProgress` with canonical slugs; then `refreshMemberProgramProgressRollup`

- [ ] **Step 2: Test** that mapping does not demote an existing COMPLETED local row

- [ ] **Step 3: Commit** `fix(coursera): promote unmatched B4B rows through the merge ladder`

---

### Task 7: Validated course list (stop umbrella B4B as Y)

**Files:**
- Create: `lib/coursera/programCourseList.ts`
- Create: `lib/coursera/programCourseList.test.ts`
- Modify: `lib/member/loadProgramCourses.ts` — if `courseraB4BProgramId` equals the org umbrella (`TpIlAogTQ8-SJQKIE8PP9w` or `process.env.COURSERA_ORG_PROGRAM_ID`), skip B4B-live list; go Course DB → static
- Modify: `lib/member/memberProgramTrainingView.ts` and rollup to call `loadValidatedProgramCourses`

**Interfaces:**
- Produces: `loadValidatedProgramCourses(args) => { courses: ProgramCourse[]; source: 'syllabus' | 'course_db' | 'static'; unmappedSlugs: string[]; staleCourseraIds: string[] }`
- Consumes: `getProgramBySlug`, canonical mappings, optional `loadB4BContents` for stale-id check (not for replacing the list)

```ts
export const COURSERA_UMBRELLA_PROGRAM_ID = 'TpIlAogTQ8-SJQKIE8PP9w';

export function isUmbrellaB4BProgramId(id: string | null | undefined): boolean {
  return (id?.trim() ?? '') === COURSERA_UMBRELLA_PROGRAM_ID;
}
```

- [ ] **Step 1: Failing tests** — `isUmbrellaB4BProgramId` true for the shared id; `loadValidatedProgramCourses` for two different program slugs returns **different** Y (IT Support vs PM) even if a mock B4B umbrella returns 80 contents
- [ ] **Step 2: Run tests** — expect FAIL
- [ ] **Step 3: Implement skip-umbrella + validated loader**; wire `loadProgramCourses` to use it
- [ ] **Step 4: Tests pass**
- [ ] **Step 5: Commit** `fix(coursera): do not use B4B umbrella contents as every program's course list`

---

### Task 8: Percent formula + reconciliation

**Files:**
- Create: `lib/coursera/progressReconciliation.ts`
- Create: `lib/coursera/progressReconciliation.test.ts`
- Modify: `lib/partner/memberProgress.ts` — `memberProgramCompleted` is `completedCount >= totalCourses && totalCourses > 0` only
- Modify: `app/admin/training-progress/page.tsx` — do not `?? 0` for missing join; treat missing as “no fact” and exclude from mean **or** show em-dash (prefer exclude from mean, still count in Y for X/Y)
- Modify: `lib/admin/diagnoseMemberCoursera.ts` — append reconcile rows
- Modify: `lib/member/memberProgramTrainingView.ts` — program % from reconcile helper

**Interfaces:**
- Produces: `reconcileProgramProgress({ validatedCourses, b4bProgress, localRows }) => { rows, completedCount, totalCourses, programPercent, allComplete }`

- [ ] **Step 1: Tests**
  - 4-course list, B4B 100/100/40/missing-local 0 → X=2, % = round((100+100+40+0)/4)=60, `allComplete` false
  - slug miss on local only → `drift: 'slug_mismatch'` or `missing_local`, not silent 0 in X
  - `memberProgramCompleted` false when % is 100 from a single course and Y=7
- [ ] **Step 2: Run tests** — FAIL
- [ ] **Step 3: Implement + switch training view and admin mean to the helper**
- [ ] **Step 4: Tests pass**
- [ ] **Step 5: Commit** `fix(coursera): one X/Y/% formula and per-course Coursera reconcile`

---

### Task 9: Key milestone detectors

**Files:**
- Create: `lib/coursera/milestones.ts`
- Create: `lib/coursera/milestones.test.ts`
- Modify: `lib/milestoneCascade/types.ts` — add `training_started`, `first_course_completed`, `program_halfway`, `program_completed` (keep `course_completed`)
- Modify: `lib/milestoneCascade/buildCascadeFromCompletion.ts` — dispatch by type; keep enterprise-sync skip for celebration types
- Modify: `lib/member/courseCompletion.ts` / B4B newly-completed path — call detectors after persist (linked users)
- Modify: `lib/member/getMemberState.ts` — checklist from same detectors

**Interfaces:**
- Produces:

```ts
export type MilestoneKey =
  | 'training_started'
  | 'first_course_completed'
  | 'course_completed'
  | 'program_halfway'
  | 'program_completed';

export function detectMilestoneTransitions(args: {
  previous: { completedSlugs: string[]; started: boolean };
  next: { completedSlugs: string[]; started: boolean; validatedSlugs: string[] };
  courseSlugJustCompleted?: string;
}): MilestoneKey[];
```

Halfway: `next.completedSlugs.length >= Math.ceil(validatedSlugs.length / 2)` and `validatedSlugs.length >= 2`, and previous was below that threshold.

- [ ] **Step 1: Fixture Y=4** — start course 1 → `training_started`; complete 1 → `first_course_completed` + `course_completed`; complete 2 → `course_completed` + `program_halfway`; complete 3 → `course_completed` only; complete 4 → `course_completed` + `program_completed`. Enterprise-sync source does not return celebration keys to the cascade builder.
- [ ] **Step 2: Run tests** — FAIL
- [ ] **Step 3: Implement detectors; wire complete + B4B newlyCompleted; checklist uses `started` / `completedSlugs.length`**
- [ ] **Step 4: Tests pass**
- [ ] **Step 5: Commit** `feat(coursera): key training milestones from validated progress`

---

## Out of scope (explicit)

- SAML / SCIM / auto-invite (`docs/COURSERA-INVITE-ON-JOIN.md`)
- Skillset cron / `getSkillScoreForLearners`
- Creating WAP accounts or sending mail to unmatched Gmails
- Treating 93% as complete
- Partner weekly digest including unmatched
- Full `app/admin/coursera/page.tsx` split (thermo audit 2026-07-08) — only touch what this progress path needs
- Rewriting TWC syllabus copy (already governed by `docs/plans/2026-07-15-twc-syllabus-accuracy.md`) — this plan only **binds** those courses to Coursera ids
- Unmatched-learner celebration emails
- Cascade LLM draft quality (inbox UX stays as-is; we only emit the right milestone types)

## Verification (after implementation)

- Unit: slug helper, B4B unmatched plan, completeMemberCourse without enrollment, merge ladder, **validated list (two programs ≠ umbrella Y)**, **reconcile X/Y/%**, **milestone transitions on Y=4 fixture**
- `npm run typecheck` + targeted `node --test` files above
- Prod-shaped SQL: unmatched `coursera_course_progress` count rises after a B4B run; `course_progress` alias slugs trend to 0 after backfill
- Catalog health: IT Support Y stays 7 (or syllabus length), not the org content count; 35 unmatched contents listed as extras
- Admin UI: training-progress shows Unmatched rows with real %, linked July completers visible with No program; diagnose page shows per-course Coursera vs WAP
- Member UI (linked): CompTIA enrollment sees CompTIA course % (slug join); “3 of 7” uses validated Y
- Stake: no dashboard copy that says complete at < Coursera `isCompleted`
- Milestones: completing the first validated course creates `first_course_completed` + `course_completed` for a linked enrolled user; unmatched creates none; `program_completed` only at X === Y

## Approval

- [x] Dashboard progress semantics stake read (`docs/PRODUCT_STAKES.md`)
- [ ] Explicit Mike approval **not** required for code that only persists and displays Coursera facts
- [ ] Explicit Mike approval **required** before production slug backfill `--apply` and before any unmatched learner receives email
